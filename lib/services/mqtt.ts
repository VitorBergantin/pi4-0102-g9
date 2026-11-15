import mqtt, { MqttClient } from "mqtt"
import { SensorReading, DeviceStatus } from "@/lib/types/sensor"

const mqttUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL || "ws://localhost:9001"
const mqttUser = process.env.NEXT_PUBLIC_MQTT_USER
const mqttPassword = process.env.NEXT_PUBLIC_MQTT_PASSWORD

/**
 * Valida se os valores da medição respeitam os limites físicos dos sensores,
 * espelhando as mesmas regras aplicadas pelo servidor Java.
 */
function isValidReading(reading: SensorReading): boolean {
  if (!reading.deviceId || reading.deviceId.trim() === "") return false
  if (Number.isNaN(Date.parse(reading.timestamp))) return false
  if (reading.co2 <= 0) return false
  if (reading.humidity < 0 || reading.humidity > 100) return false
  if (reading.temperature < -40 || reading.temperature > 90) return false
  return true
}

/**
 * Conecta ao broker MQTT via WebSocket.
 * 
 * Localmente: ws://localhost:9001
 * Nuvem (EMQX): wss://f082ab82.ala.us-east-1.emqxsl.com:8084
 */
export function initMqttConnection(
  onReading?: (reading: SensorReading) => void,
  onStatus?: (status: DeviceStatus) => void
): () => void {
  console.log("[MQTT] Conectando ao broker em:", mqttUrl)

  const client: MqttClient = mqtt.connect(mqttUrl, {
    clientId: "co2nect-web-" + Math.random().toString(16).substring(2, 8),
    username: mqttUser,
    password: mqttPassword,
    clean: true,
    reconnectPeriod: 3000, // Tenta reconectar a cada 3s em caso de perda de conexão
  })

  client.on("connect", () => {
    // Se o componente foi desmontado enquanto conectava, não tenta assinar tópicos
    if (client.disconnecting) {
      return
    }
    
    console.log("[MQTT] Conectado ao broker com sucesso.")

    const topics = ["co2nect/+/telemetry", "co2nect/+/status"]
    client.subscribe(topics, (err) => {
      if (err) {
        console.error("[MQTT] Falha ao assinar tópicos:", err)
      } else {
        console.log("[MQTT] Tópicos assinados com sucesso:", topics)
      }
    })
  })

  client.on("message", (topic: string, payload: Buffer) => {
    try {
      const data = JSON.parse(payload.toString())

      if (topic.endsWith("/telemetry")) {
        const formattedReading: SensorReading = {
          id: `mqtt-${Date.now()}`,
          deviceId: data.deviceId || topic.split("/")[1] || "ESP32",
          timestamp: data.measuredAt || new Date().toISOString(),
          co2: Number(data.co2),
          temperature: Number(data.temperature),
          humidity: Number(data.humidity),
        }

        if (!isValidReading(formattedReading)) {
          console.warn("[MQTT] Medição descartada por conter valores fora dos limites válidos:", formattedReading)
          return
        }

        console.log("[MQTT] Nova medição recebida:", formattedReading)

        if (onReading) {
          onReading(formattedReading)
        }
      } else if (topic.endsWith("/status")) {
        const deviceId = data.deviceId || topic.split("/")[1] || "ESP32"
        const isOnline = data.status === 1

        console.log(`[MQTT] Status do dispositivo ${deviceId}:`, isOnline ? "Online" : "Offline")

        if (onStatus) {
          onStatus({
            deviceId,
            online: isOnline,
            timestamp: new Date().toISOString(),
          })
        }
      }
    } catch (error) {
      console.error("[MQTT] Erro ao decodificar JSON recebido:", error)
    }
  })

  client.on("error", (err) => {
    console.error("[MQTT] Erro no cliente MQTT:", err)
  })

  // Retorna função de limpeza (cleanup) para fechar conexão caso o componente seja desmontado
  return () => {
    console.log("[MQTT] Fechando conexão com o broker...")
    client.end()
  }
}

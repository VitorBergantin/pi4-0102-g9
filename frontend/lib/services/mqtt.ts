import mqtt, { type MqttClient } from "mqtt"
import type { SensorReading, DeviceStatus } from "@/lib/types/sensor"

// Em produção, não tenta um broker arbitrário se a URL não foi configurada.
// Durante testes automatizados, utiliza um endereço simbólico para o cliente simulado.
const configuredUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL?.trim()
const mqttUrl = configuredUrl || (process.env.NODE_ENV === "test" ? "ws://localhost:9001" : "")
const mqttUser = process.env.NEXT_PUBLIC_MQTT_USER
const mqttPassword = process.env.NEXT_PUBLIC_MQTT_PASSWORD

export type MqttConnectionState = "connecting" | "connected" | "disconnected"

function isValidMqttUrl(url: string): boolean {
  if (!/^wss?:\/\/[^/?#\s]+/i.test(url)) return false
  try {
    const parsed = new URL(url)
    return ["ws:", "wss:"].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.href.includes("#")
  } catch {
    return false
  }
}

function isValidReading(reading: SensorReading): boolean {
  if (typeof reading.deviceId !== "string" || !reading.deviceId.trim()) return false
  if (!Number.isFinite(Date.parse(reading.timestamp))) return false
  if (![reading.co2, reading.temperature, reading.humidity].every(Number.isFinite)) return false
  if (reading.co2 <= 0) return false
  if (reading.temperature < -40 || reading.temperature > 90) return false
  if (reading.humidity < 0 || reading.humidity > 100) return false
  return true
}

function parseDeviceStatus(message: string): boolean | null {
  if (message === "1") return true
  if (message === "0") return false
  try {
    const value: unknown = JSON.parse(message)
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null
    const status = (value as { status?: unknown }).status
    if (status === 1 || status === "1") return true
    if (status === 0 || status === "0") return false
    return null
  } catch {
    return null
  }
}

export function initMqttConnection(
  onReading?: (reading: SensorReading) => void,
  onStatus?: (status: DeviceStatus) => void,
  onConnectionChange?: (state: MqttConnectionState) => void,
): () => void {
  if (!mqttUrl) {
    console.warn("[MQTT] Configure NEXT_PUBLIC_MQTT_WS_URL no .env.local para conectar ao broker.")
    onConnectionChange?.("disconnected")
    return () => {}
  }
  console.log("[MQTT] Conectando ao broker em:", mqttUrl)
  onConnectionChange?.("connecting")

  // MQTT no navegador exige WebSocket. Uma URL inválida não deve quebrar a tela.
  if (!isValidMqttUrl(mqttUrl)) {
    console.error("[MQTT] URL inválida: use ws:// ou wss://.")
    onConnectionChange?.("disconnected")
    return () => {}
  }

  let client: MqttClient
  try {
    client = mqtt.connect(mqttUrl, {
      clientId: "co2nect-web-" + Math.random().toString(16).substring(2, 8),
      username: mqttUser,
      password: mqttPassword,
      clean: true,
      reconnectPeriod: 3000,
    })
  } catch (error) {
    console.error("[MQTT] Não foi possível iniciar a conexão:", error)
    onConnectionChange?.("disconnected")
    return () => {}
  }

  client.on("connect", () => {
    if (client.disconnecting) return
    console.log("[MQTT] Conectado ao broker com sucesso.")
    onConnectionChange?.("connected")
    const topics = ["co2nect/+/telemetry", "co2nect/+/status"]
    client.subscribe(topics, error => {
      if (error) {
        console.error("[MQTT] Falha ao assinar tópicos:", error)
        onConnectionChange?.("disconnected")
      } else console.log("[MQTT] Tópicos assinados:", topics)
    })
  })

  client.on("message", (topic, payload) => {
    const parts = topic.split("/")
    if (parts.length !== 3 || parts[0] !== "co2nect" || !parts[1]) return
    const deviceId = parts[1]
    const messageType = parts[2]
    const message = payload.toString().trim()

    if (messageType === "status") {
      const online = parseDeviceStatus(message)
      if (online === null) {
        console.warn(`[MQTT] Status inválido para ${deviceId}:`, message)
        return
      }
      console.log(`[MQTT] Dispositivo ${deviceId}:`, online ? "Online" : "Offline")
      onStatus?.({ deviceId, online, timestamp: new Date().toISOString() })
      return
    }

    if (messageType !== "telemetry") return
    try {
      const data: unknown = JSON.parse(message)
      if (typeof data !== "object" || data === null || Array.isArray(data)) return
      const values = data as Record<string, unknown>
      if (
        typeof values.measuredAt !== "string" ||
        !Number.isFinite(Date.parse(values.measuredAt)) ||
        !["co2", "temperature", "humidity"].every(field => typeof values[field] === "number") ||
        (values.deviceId !== undefined && (typeof values.deviceId !== "string" || values.deviceId !== deviceId))
      ) return

      const formattedReading: SensorReading = {
        id: `mqtt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        deviceId,
        timestamp: values.measuredAt,
        co2: values.co2 as number,
        temperature: values.temperature as number,
        humidity: values.humidity as number,
      }
      if (!isValidReading(formattedReading)) {
        console.warn("[MQTT] Medição descartada por valores inválidos:", formattedReading)
        return
      }
      console.log("[MQTT] Nova medição recebida:", formattedReading)
      onReading?.(formattedReading)
    } catch (error) {
      console.error("[MQTT] Erro ao interpretar telemetria:", error)
    }
  })

  // Não confundir o último status recebido com o estado ATUAL da conexão.
  client.on("reconnect", () => {
    console.log("[MQTT] Tentando reconectar ao broker...")
    onConnectionChange?.("connecting")
  })
  client.on("offline", () => {
    console.warn("[MQTT] Broker indisponível.")
    onConnectionChange?.("disconnected")
  })
  client.on("close", () => onConnectionChange?.("disconnected"))
  client.on("error", error => {
    console.error("[MQTT] Erro de conexão:", error)
    onConnectionChange?.("disconnected")
  })

  return () => {
    console.log("[MQTT] Encerrando conexão.")
    client.end(true)
  }
}

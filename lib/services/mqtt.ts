
import mqtt, { type MqttClient } from "mqtt"
import type { SensorReading, DeviceStatus } from "@/lib/types/sensor"

const mqttUrl =
  process.env.NEXT_PUBLIC_MQTT_WS_URL || "ws://localhost:9001"

const mqttUser = process.env.NEXT_PUBLIC_MQTT_USER
const mqttPassword = process.env.NEXT_PUBLIC_MQTT_PASSWORD

// Valida as medições antes de enviá-las ao Dashboard.
function isValidReading(reading: SensorReading): boolean {
  if (!reading.deviceId.trim()) return false

  if (Number.isNaN(Date.parse(reading.timestamp))) return false

  if (
    !Number.isFinite(reading.co2) ||
    !Number.isFinite(reading.temperature) ||
    !Number.isFinite(reading.humidity)
  ) {
    return false
  }

  if (reading.co2 <= 0) return false
  if (reading.temperature < -40 || reading.temperature > 90) return false
  if (reading.humidity < 0 || reading.humidity > 100) return false

  return true
}

// O ESP32 publica "1" para online e "0" para offline.
// Também aceitamos JSON com o campo status.
function parseDeviceStatus(message: string): boolean | null {
  if (message === "1") return true
  if (message === "0") return false

  try {
    const parsed: unknown = JSON.parse(message)

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null
    }

    const status = (parsed as { status?: unknown }).status

    if (status === 1 || status === "1") return true
    if (status === 0 || status === "0") return false

    return null
  } catch {
    return null
  }
}

export function initMqttConnection(
  onReading?: (reading: SensorReading) => void,
  onStatus?: (status: DeviceStatus) => void
): () => void {
  console.log("[MQTT] Conectando ao broker em:", mqttUrl)

  const client: MqttClient = mqtt.connect(mqttUrl, {
    clientId:
      "co2nect-web-" + Math.random().toString(16).substring(2, 8),
    username: mqttUser,
    password: mqttPassword,
    clean: true,
    reconnectPeriod: 3000,
  })

  client.on("connect", () => {
    if (client.disconnecting) return

    console.log("[MQTT] Conectado ao broker com sucesso.")

    const topics = [
      "co2nect/+/telemetry",
      "co2nect/+/status",
    ]

    client.subscribe(topics, (error) => {
      if (error) {
        console.error("[MQTT] Falha ao assinar tópicos:", error)
      } else {
        console.log("[MQTT] Tópicos assinados:", topics)
      }
    })
  })

  client.on("message", (topic, payload) => {
    const message = payload.toString().trim()

    const topicParts = topic.split("/")

    if (
      topicParts.length !== 3 ||
      topicParts[0] !== "co2nect" ||
      !topicParts[1]
    ) {
      return
    }

    const deviceId = topicParts[1]
    const messageType = topicParts[2]

    // STATUS DO ESP32
    if (messageType === "status") {
      const online = parseDeviceStatus(message)

      if (online === null) {
        console.warn(
          `[MQTT] Status inválido para ${deviceId}:`,
          message
        )
        return
      }

      console.log(
        `[MQTT] Dispositivo ${deviceId}:`,
        online ? "Online" : "Offline"
      )

      onStatus?.({
        deviceId,
        online,
        timestamp: new Date().toISOString(),
      })

      return
    }

    // MEDIÇÕES DO ESP32
    if (messageType !== "telemetry") return

    try {
      const data: unknown = JSON.parse(message)

      if (
        typeof data !== "object" ||
        data === null ||
        Array.isArray(data)
      ) {
        console.warn("[MQTT] Telemetria inválida:", message)
        return
      }

      const values = data as Record<string, unknown>

      const formattedReading: SensorReading = {
        id: `mqtt-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`,
        deviceId,
        timestamp:
          typeof values.measuredAt === "string"
            ? values.measuredAt
            : new Date().toISOString(),
        co2: Number(values.co2),
        temperature: Number(values.temperature),
        humidity: Number(values.humidity),
      }

      if (!isValidReading(formattedReading)) {
        console.warn(
          "[MQTT] Medição descartada por valores inválidos:",
          formattedReading
        )
        return
      }

      console.log(
        "[MQTT] Nova medição recebida:",
        formattedReading
      )

      onReading?.(formattedReading)
    } catch (error) {
      console.error(
        "[MQTT] Erro ao interpretar telemetria:",
        error
      )
    }
  })

  client.on("reconnect", () => {
    console.log("[MQTT] Tentando reconectar ao broker...")
  })

  client.on("offline", () => {
    console.warn("[MQTT] Broker indisponível.")
  })

  client.on("error", (error) => {
    console.error("[MQTT] Erro de conexão:", error)
  })

  return () => {
    console.log("[MQTT] Encerrando conexão.")
    client.end(true)
  }
}

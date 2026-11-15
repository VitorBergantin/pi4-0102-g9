
import mqtt, { type MqttClient } from "mqtt"
import type { DeviceStatus, SensorReading } from "@/lib/types/sensor"

// URL pública de WebSocket, sem credenciais privadas.
const mqttUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL

export function initMqttConnection(
  onReading?: (reading: SensorReading) => void,
  onStatus?: (status: DeviceStatus) => void
): () => void {
  if (!mqttUrl) {
    console.info("[MQTT] WebSocket não configurado. Usando dados de teste.")
    return () => {}
  }

  if (!/^wss?:\/\//i.test(mqttUrl)) {
    console.error("[MQTT] A URL precisa começar com ws:// ou wss://")
    return () => {}
  }

  let client: MqttClient

  try {
    client = mqtt.connect(mqttUrl, {
      clientId: `co2nect-web-${Math.random().toString(16).slice(2)}`,
      clean: true,
      reconnectPeriod: 3000,
    })
  } catch (error) {
    console.error("[MQTT] Não foi possível iniciar a conexão:", error)
    return () => {}
  }

  client.on("connect", () => {
    console.info("[MQTT] Conectado ao broker.")

    client.subscribe(
      ["co2nect/+/telemetry", "co2nect/+/status"],
      (error) => {
        if (error) {
          console.error("[MQTT] Erro ao assinar tópicos:", error)
        }
      }
    )
  })

  client.on("message", (topic, payload) => {
    const message = payload.toString().trim()
    const deviceFromTopic = topic.split("/")[1]

    if (topic.endsWith("/status")) {
      try {
        let online: boolean | undefined

        if (message === "1") {
          online = true
        } else if (message === "0") {
          online = false
        } else {
          const data: unknown = JSON.parse(message)

          if (typeof data === "object" && data !== null) {
            const status = (data as { status?: unknown }).status

            if (status === 1 || status === "1" || status === true) {
              online = true
            } else if (
              status === 0 ||
              status === "0" ||
              status === false
            ) {
              online = false
            }
          }
        }

        if (online !== undefined) {
          onStatus?.({
            deviceId: deviceFromTopic,
            online,
            timestamp: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error("[MQTT] Status inválido:", error)
      }

      return
    }

    if (!topic.endsWith("/telemetry")) return

    try {
      const data: unknown = JSON.parse(message)

      if (typeof data !== "object" || data === null) return

      const reading = data as Record<string, unknown>

      if (
        typeof reading.co2 !== "number" ||
        typeof reading.temperature !== "number" ||
        typeof reading.humidity !== "number" ||
        !Number.isFinite(reading.co2) ||
        !Number.isFinite(reading.temperature) ||
        !Number.isFinite(reading.humidity)
      ) {
        console.warn("[MQTT] Medição com valores inválidos.")
        return
      }

      const timestamp =
        typeof reading.measuredAt === "string" &&
        Number.isFinite(Date.parse(reading.measuredAt))
          ? reading.measuredAt
          : new Date().toISOString()

      const deviceId =
        typeof reading.deviceId === "string" && reading.deviceId
          ? reading.deviceId
          : deviceFromTopic

      onReading?.({
        id: `mqtt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        deviceId,
        timestamp,
        co2: reading.co2,
        temperature: reading.temperature,
        humidity: reading.humidity,
      })
    } catch (error) {
      console.error("[MQTT] Medição inválida:", error)
    }
  })

  client.on("error", (error) => {
    console.error("[MQTT] Erro de conexão:", error)
  })

  return () => {
    client.end(true)
  }
}

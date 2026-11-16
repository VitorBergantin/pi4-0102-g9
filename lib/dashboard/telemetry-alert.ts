import { isCriticalCo2 } from "@/lib/air-quality"
import type { InternalAlertUpdate } from "@/lib/dashboard/alert-state"
import type { SensorReading } from "@/lib/types/sensor"

/**
 * Classificação LOCAL da telemetria existente; não é um payload CT7.
 * A revisão usa o instante da medição (milissegundos), nunca a chegada.
 * Pode ser substituída por um adaptador quando houver contrato de alerta.
 */
export function createTelemetryAlertUpdate(reading: SensorReading): InternalAlertUpdate | null {
  if (
    !reading ||
    typeof reading.deviceId !== "string" ||
    !reading.deviceId.trim() ||
    reading.deviceId !== reading.deviceId.trim() ||
    typeof reading.timestamp !== "string" ||
    !Number.isFinite(reading.co2) ||
    !Number.isFinite(reading.temperature) ||
    !Number.isFinite(reading.humidity) ||
    reading.co2 <= 0 ||
    reading.temperature < -40 || reading.temperature > 90 ||
    reading.humidity < 0 || reading.humidity > 100
  ) return null

  const revision = Date.parse(reading.timestamp)
  if (!Number.isSafeInteger(revision) || revision < 0) return null

  return {
    deviceId: reading.deviceId,
    state: isCriticalCo2(reading.co2)
      ? { status: "active", revision, co2: reading.co2 }
      : { status: "inactive", revision },
  }
}

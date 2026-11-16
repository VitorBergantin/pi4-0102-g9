import { ActiveAlert } from "@/components/dashboard/ActiveAlert"
import { getDeviceAlertState, type DeviceAlertStates } from "@/lib/dashboard/alert-state"
import type { SensorReading } from "@/lib/types/sensor"

interface DashboardActiveAlertProps {
  deviceId: string
  alertStates?: DeviceAlertStates
  currentReading?: SensorReading
  currentReadingSource?: "MQTT" | "Supabase"
}

export function DashboardActiveAlert({
  deviceId,
  alertStates = {},
  currentReading,
  currentReadingSource,
}: DashboardActiveAlertProps) {
  const alert = getDeviceAlertState(alertStates, deviceId)

  if (alert.status !== "active") return null

  // revision vem de measuredAt no adaptador MQTT; não é o horário de chegada.
  const measuredAt = new Date(alert.revision)
  const timestamp = Number.isFinite(measuredAt.getTime()) ? measuredAt.toISOString() : undefined
  const cardRevision = currentReading ? Date.parse(currentReading.timestamp) : NaN
  const cardReading = currentReading?.deviceId === deviceId && currentReadingSource &&
    Number.isFinite(cardRevision) && Number.isFinite(currentReading.co2) &&
    (currentReadingSource !== "MQTT" || cardRevision !== alert.revision || currentReading.co2 !== alert.co2)
    ? { timestamp: new Date(cardRevision).toISOString(), co2: currentReading.co2, source: currentReadingSource }
    : undefined

  return <ActiveAlert deviceId={deviceId} co2={alert.co2} timestamp={timestamp} cardReading={cardReading} />
}

import { ActiveAlert } from "@/components/dashboard/ActiveAlert"
import { getDeviceAlertState, type DeviceAlertStates } from "@/lib/dashboard/alert-state"

interface DashboardActiveAlertProps {
  deviceId: string
  alertStates?: DeviceAlertStates
}

export function DashboardActiveAlert({
  deviceId,
  alertStates = {},
}: DashboardActiveAlertProps) {
  const alert = getDeviceAlertState(alertStates, deviceId)

  if (alert.status !== "active") return null

  return <ActiveAlert deviceId={deviceId} co2={alert.co2} />
}

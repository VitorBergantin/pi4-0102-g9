
import { AlertTriangle } from "lucide-react"

interface ActiveAlertProps {
  deviceId: string
  co2: number
}

export function ActiveAlert({
  deviceId,
  co2,
}: ActiveAlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-2xl border-2 border-red-500
        bg-red-50 p-5 text-red-900 shadow-md
        dark:bg-red-950/40 dark:text-red-100"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-6 w-6 shrink-0"
          aria-hidden="true"
        />

        <div>
          <h3 className="text-lg font-bold">
            Alerta de qualidade do ar ativo
          </h3>

          <p className="mt-1 text-sm">
            O dispositivo {deviceId} informou
            uma condição de alerta.
          </p>

          <p className="mt-2 text-sm font-semibold">
            CO₂: {co2.toLocaleString("pt-BR")} ppm
          </p>
        </div>
      </div>
    </div>
  )
}

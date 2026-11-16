
import { useId } from "react"
import { AlertTriangle } from "lucide-react"

interface ActiveAlertProps {
  deviceId: string
  co2: number
  timestamp?: string
  cardReading?: {
    timestamp: string
    co2: number
    source: "MQTT" | "Supabase"
  }
}

function formatMeasurementTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("pt-BR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    fractionalSecondDigits: 3, timeZoneName: "short",
  })
}

export function ActiveAlert({
  deviceId,
  co2,
  timestamp,
  cardReading,
}: ActiveAlertProps) {
  const titleId = useId()
  const descriptionId = useId()
  const alertRevision = timestamp ? Date.parse(timestamp) : NaN
  const cardRevision = cardReading ? Date.parse(cardReading.timestamp) : NaN
  const cardIsNewer = cardRevision > alertRevision
  const sameTimeConflict = cardRevision === alertRevision && cardReading?.co2 !== co2
  const cardSource = cardReading?.source === "Supabase" ? "histórico salvo (Supabase)" : "dispositivo (MQTT)"

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
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
          <h3 id={titleId} className="text-lg font-bold">
            {cardIsNewer ? "Alerta de uma leitura anterior do dispositivo" : "Alerta de qualidade do ar ativo"}
          </h3>

          <p className="mt-1 text-sm">
            Última leitura recebida do dispositivo {deviceId} (MQTT): condição de alerta.
          </p>

          <p className="mt-2 text-sm font-semibold">
            CO₂: {co2.toLocaleString("pt-BR")} ppm
          </p>

          {timestamp ? (
            <p className="mt-1 text-sm">
              Horário da leitura do dispositivo (MQTT): <time dateTime={timestamp}>{formatMeasurementTime(timestamp)}</time>
            </p>
          ) : (
            <p className="mt-1 text-sm">Horário da leitura do dispositivo indisponível.</p>
          )}

          <div id={descriptionId} className="mt-2 space-y-1 text-sm">
            {cardReading && (
              <>
                <p className="font-semibold">
                  {cardIsNewer
                    ? `Os cards exibem uma leitura mais recente do ${cardSource}.`
                    : sameTimeConflict
                      ? "As fontes informam valores diferentes de CO₂ para o mesmo horário."
                      : `Os cards exibem dados do ${cardSource}.`}
                </p>
                <p>
                  Leitura dos cards — {cardSource}: {cardReading.co2.toLocaleString("pt-BR")} ppm
                  {" — "}<time dateTime={cardReading.timestamp}>{formatMeasurementTime(cardReading.timestamp)}</time>
                </p>
              </>
            )}
            <p>
              Este alerta só muda quando chega uma nova leitura válida do dispositivo (MQTT); esta medição
              não confirma, por si só, a condição atual do ambiente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

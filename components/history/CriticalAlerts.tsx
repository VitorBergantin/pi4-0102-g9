import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AlertCardItem {
  id: string
  title: string
  value: string | number
  unit?: string
  description: string
  colorTheme?: "blue" | "green" | "teal" | "amber" | "red"
  isAlert?: boolean
}

interface CriticalAlertsProps {
  totalReadings?: number
  avgCo2?: number
  avgTemperature?: number
  avgHumidity?: number
  criticalCount?: number
  onlyCritical?: boolean
}

function getCo2Description(avgCo2: number): string {
  if (avgCo2 === 0) return "Sem leituras no período"
  if (avgCo2 < 800) return "Nível de ar ideal"
  if (avgCo2 <= 1200) return "Atenção: ventilação recomendada"
  return "Alerta: concentração crítica"
}

export function CriticalAlerts({
  totalReadings = 1240,
  avgCo2 = 780,
  avgTemperature = 24.5,
  avgHumidity = 55,
  criticalCount = 14,
  onlyCritical = false,
}: CriticalAlertsProps) {
  const allCards: AlertCardItem[] = [
    {
      id: "total-readings",
      title: "Total de Medições",
      value: totalReadings.toLocaleString("pt-BR"),
      description: "Registros coletados no período",
      colorTheme: "blue",
      isAlert: false,
    },
    {
      id: "avg-co2",
      title: onlyCritical ? "Média das Críticas" : "Média de CO₂",
      value: avgCo2.toLocaleString("pt-BR"),
      unit: "ppm",
      description: getCo2Description(avgCo2),
      colorTheme: avgCo2 > 1200 ? "red" : "green",
      isAlert: avgCo2 > 1200,
    },
    {
      id: "avg-temp",
      title: "Média Temperatura",
      value: avgTemperature.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      unit: "°C",
      description: "Temperatura média registrada",
      colorTheme: "blue",
      isAlert: false,
    },
    {
      id: "avg-humidity",
      title: "Média Umidade",
      value: avgHumidity.toLocaleString("pt-BR"),
      unit: "%",
      description: "Umidade relativa média",
      colorTheme: "teal",
      isAlert: false,
    },
    {
      id: "critical-alerts",
      title: "Leituras Críticas",
      value: criticalCount,
      description:
        criticalCount > 0
          ? "Valores acima do limite seguro (> 1200 ppm)"
          : "Nenhuma anomalia detectada",
      colorTheme: "red",
      isAlert: criticalCount > 0,
    },
  ]

  const cards = onlyCritical
    ? allCards.filter((card) => card.id !== "total-readings")
    : allCards

  return (
    <div
      className={cn(
        "flex overflow-x-auto gap-4 pb-2 md:grid md:overflow-visible snap-x snap-mandatory",
        onlyCritical
          ? "md:grid-cols-2 lg:grid-cols-4"
          : "md:grid-cols-3 lg:grid-cols-5"
      )}
    >
      {cards.map((card) => {
        const isBlue = card.colorTheme === "blue"
        const isGreen = card.colorTheme === "green"
        const isTeal = card.colorTheme === "teal"
        const isRed = card.colorTheme === "red"

        return (
          <Card
            key={card.id}
            className={cn(
              "bg-white border rounded-2xl shadow-sm hover:shadow-md shrink-0 w-[80%] sm:w-[60%] md:w-auto snap-start transition-all dark:bg-card",
              isGreen && !card.isAlert && "border-emerald-500/30",
              isBlue && !card.isAlert && "border-blue-500/30",
              isTeal && !card.isAlert && "border-teal-500/30",
              card.isAlert && "border-destructive/40 bg-destructive/5"
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center justify-between">
                <span>{card.title}</span>
                {card.isAlert ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" />
                ) : isGreen ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                ) : isBlue ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                ) : isTeal ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-teal-500" />
                ) : null}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold flex items-baseline gap-1 tracking-tight",
                  card.isAlert && "text-destructive",
                  !card.isAlert && isGreen && "text-emerald-700 dark:text-emerald-400",
                  !card.isAlert && isBlue && "text-blue-600 dark:text-blue-400",
                  !card.isAlert && isTeal && "text-teal-600 dark:text-teal-400"
                )}
              >
                <span>{card.value}</span>
                {card.unit && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {card.unit}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

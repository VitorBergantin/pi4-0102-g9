"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SensorReading } from "@/lib/types/sensor"

interface MetricsCardsProps {
  reading?: SensorReading
}

interface MetricCardItem {
  id: string
  title: string
  value: string | number
  unit: string
  description: string
  colorTheme: "green" | "blue" | "teal"
  isAlert?: boolean
}

function getCo2StatusText(co2: number): string {
  if (co2 < 800) return "Qualidade do ar ideal"
  if (co2 <= 1200) return "Atenção: ventilação recomendada"
  return "Alerta: concentração crítica"
}

export function MetricsCards({ reading }: MetricsCardsProps) {
  if (!reading) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Ainda não há medições para exibir.
      </p>
    )
  }

  const cards: MetricCardItem[] = [
    {
      id: "co2",
      title: "CO₂",
      value: reading.co2.toLocaleString("pt-BR"),
      unit: "ppm",
      description: getCo2StatusText(reading.co2),
      colorTheme: "green",
      isAlert: reading.co2 > 1200,
    },
    {
      id: "temperature",
      title: "Temperatura",
      value: reading.temperature.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      unit: "°C",
      description: "Temperatura ambiente atual",
      colorTheme: "blue",
    },
    {
      id: "humidity",
      title: "Umidade",
      value: reading.humidity,
      unit: "%",
      description: "Umidade relativa do ar",
      colorTheme: "teal",
    },
  ]

  return (
    <div className="flex overflow-x-auto gap-4 pb-2 md:grid md:grid-cols-3 md:overflow-visible snap-x snap-mandatory">
      {cards.map((card) => {
        const isGreen = card.colorTheme === "green"
        const isBlue = card.colorTheme === "blue"
        const isTeal = card.colorTheme === "teal"

        return (
          <Card
            key={card.id}
            className={cn(
              "bg-white border rounded-2xl shadow-sm hover:shadow-md shrink-0 w-[80%] sm:w-[60%] md:w-auto snap-start transition-all dark:bg-card",
              isGreen && !card.isAlert && "border-emerald-500/30 dark:border-emerald-500/20",
              isBlue && "border-blue-500/30 dark:border-blue-500/20",
              isTeal && "border-teal-500/30 dark:border-teal-500/20",
              card.isAlert && "border-destructive/40 bg-destructive/5"
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center justify-between">
                <span>{card.title}</span>
                {card.isAlert ? (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                ) : isGreen ? (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                ) : isBlue ? (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                ) : (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-500" />
                )}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div
                className={cn(
                  "text-3xl font-bold flex items-baseline gap-1 tracking-tight",
                  card.isAlert && "text-destructive",
                  !card.isAlert && isGreen && "text-emerald-700 dark:text-emerald-400",
                  !card.isAlert && isBlue && "text-blue-600 dark:text-blue-400",
                  !card.isAlert && isTeal && "text-teal-600 dark:text-teal-400"
                )}
              >
                <span>{card.value}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {card.unit}
                </span>
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

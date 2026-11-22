
"use client"

import { useState, useSyncExternalStore } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { isCriticalCo2 } from "@/lib/air-quality"
import type { SensorReading, DisplayPreferences } from "@/lib/types/sensor"

interface MetricsCardsProps {
  reading?: SensorReading
}

interface MetricCardItem {
  id: keyof DisplayPreferences
  title: string
  value: string | number
  unit: string
  description: string
  colorTheme: "green" | "blue" | "teal"
  isAlert?: boolean
}

const STORAGE_KEY = "co2nnect-display-preferences"

const DEFAULT_PREFERENCES: DisplayPreferences = {
  co2: true,
  temperature: true,
  humidity: true,
}

const INDICATORS: {
  id: keyof DisplayPreferences
  label: string
}[] = [
  { id: "co2", label: "CO₂" },
  { id: "temperature", label: "Temperatura" },
  { id: "humidity", label: "Umidade" },
]

function getCo2StatusText(co2: number): string {
  if (co2 < 800) return "Qualidade do ar ideal"
  if (!isCriticalCo2(co2)) return "Atenção: ventilação recomendada"
  return "Alerta: concentração crítica"
}

// Consulta as preferências armazenadas no navegador.
function getStoredPreferences(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// No servidor, usamos os indicadores visíveis por padrão.
function getServerPreferences(): string | null {
  return null
}

// Detecta mudanças nas preferências entre abas do navegador.
function subscribeToPreferences(callback: () => void) {
  window.addEventListener("storage", callback)

  return () => {
    window.removeEventListener("storage", callback)
  }
}

// Valida as preferências antes de utilizá-las.
function parsePreferences(saved: string | null): DisplayPreferences {
  if (!saved) return DEFAULT_PREFERENCES

  try {
    const parsed: unknown = JSON.parse(saved)

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return DEFAULT_PREFERENCES
    }

    const data = parsed as Record<string, unknown>

    return {
      co2:
        typeof data.co2 === "boolean"
          ? data.co2
          : true,
      temperature:
        typeof data.temperature === "boolean"
          ? data.temperature
          : true,
      humidity:
        typeof data.humidity === "boolean"
          ? data.humidity
          : true,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function MetricsCards({ reading }: MetricsCardsProps) {
  const storedPreferences = useSyncExternalStore(
    subscribeToPreferences,
    getStoredPreferences,
    getServerPreferences
  )

  const [localPreferences, setLocalPreferences] =
    useState<DisplayPreferences | null>(null)

  const displayPreferences =
    localPreferences ?? parsePreferences(storedPreferences)

  // Altera somente a visualização dos indicadores.
  function handleToggle(indicator: keyof DisplayPreferences) {
    const updatedPreferences: DisplayPreferences = {
      ...displayPreferences,
      [indicator]: !displayPreferences[indicator],
    }

    setLocalPreferences(updatedPreferences)

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedPreferences)
      )
    } catch {
      console.warn("Não foi possível salvar as preferências.")
    }
  }

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
      isAlert: isCriticalCo2(reading.co2),
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

  const visibleCards = cards.filter(
    (card) => displayPreferences[card.id]
  )

  return (
    <div className="space-y-4">
      {/* Configurações de visibilidade dos indicadores */}
      <fieldset className="rounded-2xl border border-border bg-card p-4">
        <legend className="sr-only">
          Preferências de indicadores
        </legend>

        <p className="mb-3 text-sm font-semibold text-foreground">
          Indicadores visíveis
        </p>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {INDICATORS.map((indicator) => (
            <label
              key={indicator.id}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <input
                type="checkbox"
                checked={displayPreferences[indicator.id]}
                onChange={() => handleToggle(indicator.id)}
                className="h-4 w-4 cursor-pointer accent-emerald-600"
              />
              <span>{indicator.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Exibe somente os cards selecionados */}
      {visibleCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhum indicador selecionado. Marque uma opção acima
          para exibir os indicadores novamente.
        </div>
      ) : (
        <div
          className={cn(
            "flex overflow-x-auto gap-4 pb-2 md:grid md:overflow-visible snap-x snap-mandatory",
            visibleCards.length === 1 && "md:grid-cols-1",
            visibleCards.length === 2 && "md:grid-cols-2",
            visibleCards.length === 3 && "md:grid-cols-3"
          )}
        >
          {visibleCards.map((card) => {
            const isGreen = card.colorTheme === "green"
            const isBlue = card.colorTheme === "blue"
            const isTeal = card.colorTheme === "teal"

            return (
              <Card
                key={card.id}
                className={cn(
                  "bg-white border rounded-2xl shadow-sm hover:shadow-md shrink-0 w-[80%] sm:w-[60%] md:w-auto snap-start transition-all dark:bg-card",
                  isGreen &&
                    !card.isAlert &&
                    "border-emerald-500/30 dark:border-emerald-500/20",
                  isBlue &&
                    "border-blue-500/30 dark:border-blue-500/20",
                  isTeal &&
                    "border-teal-500/30 dark:border-teal-500/20",
                  card.isAlert &&
                    "border-destructive/40 bg-destructive/5"
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
                      !card.isAlert &&
                        isGreen &&
                        "text-emerald-700 dark:text-emerald-400",
                      !card.isAlert &&
                        isBlue &&
                        "text-blue-600 dark:text-blue-400",
                      !card.isAlert &&
                        isTeal &&
                        "text-teal-600 dark:text-teal-400"
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
      )}
    </div>
  )
}

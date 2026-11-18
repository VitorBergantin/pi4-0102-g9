"use client"

import type { SensorReading } from "@/lib/types/sensor"
import { Co2Chart } from "@/components/dashboard/Co2Chart"
import { TempChart } from "@/components/dashboard/TempChart"
import { HumidityChart } from "@/components/dashboard/HumidityChart"

interface ChartsContainerProps {
  readings: readonly SensorReading[]
}

export function ChartsContainer({ readings }: ChartsContainerProps) {
  if (readings.length === 0) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground"
      >
        Ainda não há medições para exibir nos gráficos.
      </p>
    )
  }

  // Ordena cronologicamente para exibição nas séries temporais
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  return (
    <section aria-label="Evolução das medições" className="space-y-6">
      {/* Gráfico de CO₂ em destaque ocupando toda a largura no topo */}
      <Co2Chart readings={sortedReadings} />

      {/* Gráficos secundários (Temperatura e Umidade) lado a lado abaixo */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <TempChart readings={sortedReadings} />
        <HumidityChart readings={sortedReadings} />
      </div>
    </section>
  )
}

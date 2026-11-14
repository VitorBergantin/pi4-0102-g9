"use client"

import React, { useState } from "react"
import { SensorReading } from "@/lib/types/sensor"

interface ReadingsHistoryProps {
  readings?: SensorReading[]
}

interface DateRange {
  startDate: string
  endDate: string
}

function getStartOfDay(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day).getTime()
}

function getStartOfNextDay(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day + 1).getTime()
}

// Histórico de medições estruturado com as variáveis semânticas do shadcn
export function ReadingsHistory({ readings = [] }: ReadingsHistoryProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(null)
  const [filterError, setFilterError] = useState("")

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!startDate || !endDate) {
      setFilterError("Preencha a data inicial e a data final.")
      return
    }

    if (startDate > endDate) {
      setFilterError("A data inicial não pode ser posterior à data final.")
      return
    }

    setFilterError("")
    setAppliedRange({ startDate, endDate })
  }

  function handleClearFilters() {
    setStartDate("")
    setEndDate("")
    setAppliedRange(null)
    setFilterError("")
  }

  const filteredReadings = readings
    .filter((reading) => {
      const readingTime = new Date(reading.timestamp).getTime()

      if (!Number.isFinite(readingTime)) {
        return false
      }

      if (!appliedRange) {
        return true
      }

      const start = getStartOfDay(appliedRange.startDate)
      const end = getStartOfNextDay(appliedRange.endDate)

      return readingTime >= start && readingTime < end
    })
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

  function formatTimestamp(isoString: string): string {
    const date = new Date(isoString)

    if (Number.isNaN(date.getTime())) {
      return "Data inválida"
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date)
  }

  return (
    <section className="rounded-[20px] border border-border bg-card p-7 sm:p-8 shadow-[0_5px_20px_rgba(25,53,54,0.04)] space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Histórico de medições
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte as leituras registradas em um período.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Data de
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                setFilterError("")
              }}
              max={endDate || undefined}
              className="h-10 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground shadow-2xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            Data até
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value)
                setFilterError("")
              }}
              min={startDate || undefined}
              className="h-10 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground shadow-2xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        </div>

        <div className="flex gap-2.5">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-[10px] border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:opacity-90 cursor-pointer"
          >
            Pesquisar
          </button>

          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center justify-center rounded-[10px] border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-accent cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      </form>

      {filterError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive" role="alert">
          {filterError}
        </p>
      )}

      {filteredReadings.length > 0 ? (
        <div className="overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-accent/60 text-xs font-semibold tracking-wider text-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3.5">Data e hora</th>
                <th className="px-4 py-3.5">CO₂ (ppm)</th>
                <th className="px-4 py-3.5">Temperatura (°C)</th>
                <th className="px-4 py-3.5">Umidade (%)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {filteredReadings.map((reading) => (
                <tr
                  key={reading.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3 text-foreground font-medium">
                    {formatTimestamp(reading.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {reading.co2.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {reading.temperature.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{reading.humidity}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Nenhuma medição encontrada no período selecionado.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {filteredReadings.length}{" "}
        {filteredReadings.length === 1
          ? "medição encontrada"
          : "medições encontradas"}{" "}
        no período. Dados simulados para demonstração.
      </p>
    </section>
  )
}

export default ReadingsHistory

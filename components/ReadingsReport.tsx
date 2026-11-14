"use client"

import React, { useState } from "react"
import { SensorReading } from "@/lib/types/sensor"

interface ReadingsReportProps {
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

// Relatório estatístico baseado nas classes semânticas do shadcn
export function ReadingsReport({ readings = [] }: ReadingsReportProps) {
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

  const filteredReadings = readings.filter((reading) => {
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

  const totalCount = filteredReadings.length

  function calculateAverage(field: keyof Pick<SensorReading, "co2" | "temperature" | "humidity">): number | null {
    if (totalCount === 0) {
      return null
    }

    const sum = filteredReadings.reduce(
      (total, reading) => total + Number(reading[field]),
      0
    )

    return sum / totalCount
  }

  function formatAverage(field: keyof Pick<SensorReading, "co2" | "temperature" | "humidity">): string {
    const average = calculateAverage(field)

    if (average === null) {
      return "—"
    }

    const decimalPlaces = field === "co2" ? 0 : 1

    return average.toLocaleString("pt-BR", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    })
  }

  return (
    <section className="rounded-[20px] border border-border bg-card p-7 sm:p-8 shadow-[0_5px_20px_rgba(25,53,54,0.04)] space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Relatório de medições
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumo das condições ambientais por período.
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
            Gerar relatório
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-[15px] border border-border bg-muted/60 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Média de CO₂
          </h3>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            {formatAverage("co2")}{" "}
            <span className="text-sm font-normal text-muted-foreground">ppm</span>
          </p>
        </article>

        <article className="rounded-[15px] border border-border bg-muted/60 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Média de temperatura
          </h3>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            {formatAverage("temperature")}{" "}
            <span className="text-sm font-normal text-muted-foreground">°C</span>
          </p>
        </article>

        <article className="rounded-[15px] border border-border bg-muted/60 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Média de umidade
          </h3>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            {formatAverage("humidity")}{" "}
            <span className="text-sm font-normal text-muted-foreground">%</span>
          </p>
        </article>

        <article className="rounded-[15px] border border-border bg-muted/60 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total de medições
          </h3>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{totalCount}</p>
        </article>
      </div>

      {totalCount === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Nenhuma medição encontrada no período selecionado.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {totalCount}{" "}
        {totalCount === 1 ? "medição considerada" : "medições consideradas"} no
        relatório. Dados simulados para demonstração.
      </p>
    </section>
  )
}

export default ReadingsReport

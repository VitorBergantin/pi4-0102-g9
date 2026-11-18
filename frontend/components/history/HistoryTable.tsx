"use client"

import React from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SensorReading } from "@/lib/types/sensor"
import { cn } from "@/lib/utils"

interface HistoryTableProps {
  readings?: SensorReading[]
  onlyCritical?: boolean
  isLoading?: boolean
}

// Formata a data ISO para o padrão pt-BR
function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return isoString
  }
}

export function HistoryTable({ readings = [], onlyCritical = false, isLoading = false }: HistoryTableProps) {
  return (
    <Card className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden h-fit flex flex-col">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              {onlyCritical ? "Ocorrências Críticas" : "Registros de Telemetria"}
            </CardTitle>

            <CardDescription className="text-xs text-muted-foreground">
              {isLoading ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sincronizando com Supabase...</span>
                </>
              ) : (
                <>
                  Exibindo {readings.length}{" "}
                  {readings.length === 1 ? "registro encontrado" : "registros encontrados"}
                </>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span>Carregando medições do banco de dados...</span>
          </div>
        ) : readings.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-85 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="text-xs">
                  <TableHead className="font-semibold text-foreground">Data / Hora</TableHead>
                  <TableHead className="font-semibold text-foreground">Sensor</TableHead>
                  <TableHead className="font-semibold text-foreground">CO₂</TableHead>
                  <TableHead className="font-semibold text-foreground">Temperatura</TableHead>
                  <TableHead className="font-semibold text-foreground">Umidade</TableHead>
                  {!onlyCritical && (
                    <TableHead className="text-right font-semibold text-foreground">
                      Status
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {readings.map((reading) => {
                  const isGood = reading.co2 < 800
                  const isModerate = reading.co2 >= 800 && reading.co2 <= 1200
                  const isCritical = reading.co2 > 1200

                  return (
                    <TableRow key={reading.id} className="text-xs hover:bg-muted/40">
                      <TableCell className="font-medium text-foreground whitespace-nowrap">
                        {formatDateTime(reading.timestamp)}
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {reading.deviceId}
                        </span>
                      </TableCell>

                      <TableCell className={cn("font-medium", isCritical && "text-destructive font-bold")}>
                        {reading.co2}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">ppm</span>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {reading.temperature.toFixed(1)} °C
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {reading.humidity}%
                      </TableCell>

                      {!onlyCritical && (
                        <TableCell className="text-right">
                          {isGood && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 font-medium"
                            >
                              Bom
                            </Badge>
                          )}
                          {isModerate && (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 font-medium"
                            >
                              Moderado
                            </Badge>
                          )}
                          {isCritical && (
                            <Badge
                              variant="destructive"
                              className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] px-2 py-0.5 font-medium"
                            >
                              Crítico
                            </Badge>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

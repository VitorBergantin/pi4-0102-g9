"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EspSelector } from "@/components/EspSelector"
import { cn } from "@/lib/utils"

interface HistoryFiltersProps {
  startDate?: string
  endDate?: string
  selectedDevice?: string
  onlyCritical?: boolean
  availableDevices?: string[]
  onStartDateChange?: (date: string) => void
  onEndDateChange?: (date: string) => void
  onDeviceChange?: (device: string) => void
  onToggleOnlyCritical?: () => void
  onClearFilters?: () => void
}

export function HistoryFilters({
  startDate = "",
  endDate = "",
  selectedDevice = "all",
  onlyCritical = false,
  availableDevices = ["ESP32-DEV", "ESP32-SALA-01", "ESP32-LAB-02"],
  onStartDateChange,
  onEndDateChange,
  onDeviceChange,
  onToggleOnlyCritical,
  onClearFilters,
}: HistoryFiltersProps) {
  const hasActiveFilters =
    Boolean(startDate) ||
    Boolean(endDate) ||
    (selectedDevice && selectedDevice !== "all") ||
    onlyCritical

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Filtros de Auditoria</h3>
          <p className="text-xs text-muted-foreground">
            Refine as medições por período, sensor ou nível de alerta.
          </p>
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 self-start sm:self-auto cursor-pointer"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Data Inicial */}
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>Data de</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange?.(e.target.value)}
            max={endDate || undefined}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>

        {/* Data Final */}
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>Data até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange?.(e.target.value)}
            min={startDate || undefined}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>

        {/* Dropdown dos Dispositivos */}
        <EspSelector
          selectedDevice={selectedDevice}
          availableDevices={availableDevices}
          onDeviceChange={onDeviceChange}
          showAllOption
          layout="stacked"
        />

        {/* Botão de Toggle para Apenas Críticas */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onToggleOnlyCritical}
            className={cn(
              "w-full h-9 inline-flex items-center justify-between rounded-lg border px-3 py-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs",
              onlyCritical
                ? "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <span>Apenas Críticas</span>
            <Badge
              variant={onlyCritical ? "destructive" : "secondary"}
              className="text-[10px] px-1.5 py-0 h-4"
            >
              {onlyCritical ? "Ativo" : "Off"}
            </Badge>
          </button>
        </div>
      </div>
    </div>
  )
}

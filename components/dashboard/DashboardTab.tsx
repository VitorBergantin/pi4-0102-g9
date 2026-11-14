"use client"

import React, { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { EspSelector } from "@/components/EspSelector"
import { MetricsCards } from "@/components/dashboard/MetricsCards"
import { ChartsContainer } from "@/components/dashboard/ChartsContainer"
import { historyMock, getDeviceOnlineStatus } from "@/lib/mocks/readingsMock"
import { cn } from "@/lib/utils"

interface DashboardTabProps {
  selectedDevice?: string
  onDeviceChange?: (device: string) => void
}

function formatLastUpdate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dateString))
  } catch {
    return dateString
  }
}

export function DashboardTab({
  selectedDevice: controlledDevice,
  onDeviceChange,
}: DashboardTabProps = {}) {
  const availableDevices = useMemo(() => {
    const devices = Array.from(new Set(historyMock.map((r) => r.deviceId)))
    return devices.length > 0 ? devices : ["ESP32-DEV", "ESP32-SALA-01", "ESP32-LAB-02"]
  }, [])

  const [internalDevice, setInternalDevice] = useState<string>(
    () => availableDevices[0]
  )

  const currentDevice = controlledDevice ?? internalDevice

  function handleDeviceChange(device: string) {
    if (onDeviceChange) {
      onDeviceChange(device)
    } else {
      setInternalDevice(device)
    }
  }

  const filteredReadings = useMemo(() => {
    return historyMock.filter((reading) => reading.deviceId === currentDevice)
  }, [currentDevice])

  const currentReading = filteredReadings[0]
  const isOnline = getDeviceOnlineStatus(currentDevice)

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Cabeçalho da Aba + Seletor de Dispositivo ESP32 com Indicador de Conexão */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard
            </h2>
            {currentReading && (
              <Badge
                variant="secondary"
                className="text-xs font-medium px-2.5 py-0.5"
              >
                Última leitura: {formatLastUpdate(currentReading.timestamp)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoramento em tempo real das condições ambientais dos sensores.
          </p>
        </div>

        {/* Seletor + Badge de Conectividade do Sensor */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <EspSelector
            selectedDevice={currentDevice}
            availableDevices={availableDevices}
            onDeviceChange={handleDeviceChange}
          />

          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 h-9 text-xs font-semibold shadow-2xs transition-all",
              isOnline
                ? "border-emerald-500/30 bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30"
                : "border-slate-300/80 bg-slate-100 text-slate-500 dark:border-border dark:bg-muted dark:text-muted-foreground"
            )}
            title={isOnline ? `${currentDevice} está online` : `${currentDevice} está offline`}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              )}
            />
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Cards de Indicadores Atuais (Carrossel no Mobile, Grid no Desktop) */}
      <MetricsCards reading={currentReading} />

      {/* Gráficos: CO₂ em Destaque (Largura Total) + Temperatura e Umidade Abaixo */}
      <ChartsContainer readings={filteredReadings} />
    </div>
  )
}

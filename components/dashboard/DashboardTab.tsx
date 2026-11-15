
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { EspSelector } from "@/components/EspSelector"
import { MetricsCards } from "@/components/dashboard/MetricsCards"
import { ChartsContainer } from "@/components/dashboard/ChartsContainer"
import {
  historyMock,
  simulatedReadings,
  getDeviceOnlineStatus,
} from "@/lib/mocks/readingsMock"
import { initMqttConnection } from "@/lib/services/mqtt"
import type { DeviceStatus, SensorReading } from "@/lib/types/sensor"
import { cn } from "@/lib/utils"

interface DashboardTabProps {
  selectedDevice?: string
  onDeviceChange?: (device: string) => void
}

function formatLastUpdate(dateString: string): string {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) return dateString

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export function DashboardTab({
  selectedDevice: controlledDevice,
  onDeviceChange,
}: DashboardTabProps = {}) {
  const [realtimeReadings, setRealtimeReadings] = useState<SensorReading[]>([])
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, boolean>>({})
  const [simulationIndex, setSimulationIndex] = useState(0)
  const [internalDevice, setInternalDevice] = useState("ESP32-DEV")

  const currentDevice = controlledDevice ?? internalDevice

  // Executado sempre que uma nova medição válida é recebida.
  const handleNovaMedicao = useCallback((reading: SensorReading) => {
    if (
      !reading.deviceId ||
      !Number.isFinite(Date.parse(reading.timestamp)) ||
      !Number.isFinite(reading.co2) ||
      !Number.isFinite(reading.temperature) ||
      !Number.isFinite(reading.humidity)
    ) {
      return
    }

    setRealtimeReadings((previous) => [
      reading,
      ...previous,
    ].slice(0, 100))
  }, [])

  const handleDeviceStatus = useCallback((status: DeviceStatus) => {
    setDeviceStatuses((previous) => ({
      ...previous,
      [status.deviceId]: status.online,
    }))
  }, [])

  // Abre a conexão e a encerra quando o componente é desmontado.
  useEffect(() => {
    return initMqttConnection(handleNovaMedicao, handleDeviceStatus)
  }, [handleNovaMedicao, handleDeviceStatus])

  // Lista dinâmica de dispositivos, incluindo os recebidos via MQTT.
  const availableDevices = useMemo(() => {
    return Array.from(
      new Set(
        [...historyMock, ...realtimeReadings].map(
          (reading) => reading.deviceId
        )
      )
    )
  }, [realtimeReadings])

  function handleDeviceChange(device: string) {
    if (onDeviceChange) {
      onDeviceChange(device)
    } else {
      setInternalDevice(device)
    }
  }

  // Combina leituras recebidas com os exemplos disponíveis.
  const filteredReadings = useMemo(() => {
    return [...realtimeReadings, ...historyMock]
      .filter((reading) => reading.deviceId === currentDevice)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      )
  }, [currentDevice, realtimeReadings])

  // A leitura mais recente é usada pelos três cards.
  const currentReading = filteredReadings[0]

  const hasRealtimeReading = realtimeReadings.some(
    (reading) =>
      reading.id === currentReading?.id &&
      reading.deviceId === currentDevice
  )

  const hasRealStatus = Object.prototype.hasOwnProperty.call(
    deviceStatuses,
    currentDevice
  )

  const isOnline = hasRealStatus
    ? deviceStatuses[currentDevice]
    : getDeviceOnlineStatus(currentDevice)

  // Botão de teste disponível somente em desenvolvimento.
  function handleSimularMedicao() {
    const values =
      simulatedReadings[simulationIndex % simulatedReadings.length]

    handleNovaMedicao({
      id: `sim-${Date.now()}-${simulationIndex}`,
      deviceId: currentDevice,
      timestamp: new Date().toISOString(),
      ...values,
    })

    setSimulationIndex((previous) => previous + 1)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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

            <Badge variant="outline">
              {hasRealtimeReading
                ? "Nova medição recebida"
                : "Dados de exemplo"}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoramento das condições ambientais dos sensores.
          </p>
        </div>

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
                ? "border-emerald-500/30 bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-slate-300/80 bg-slate-100 text-slate-500 dark:border-border dark:bg-muted"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isOnline ? "bg-emerald-500" : "bg-slate-400"
              )}
            />
            <span>
              {hasRealStatus
                ? isOnline
                  ? "Online"
                  : "Offline"
                : isOnline
                  ? "Online (simulado)"
                  : "Offline (simulado)"}
            </span>
          </div>

          {process.env.NODE_ENV === "development" && (
            <button
              type="button"
              onClick={handleSimularMedicao}
              className="h-9 rounded-xl border border-emerald-600 bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Simular nova medição
            </button>
          )}
        </div>
      </div>

      <MetricsCards reading={currentReading} />

      <ChartsContainer readings={filteredReadings} />
    </div>
  )
}

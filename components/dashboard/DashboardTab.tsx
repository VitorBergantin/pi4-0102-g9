
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

import { fetchReadings } from "@/lib/services/supabase"
import { initMqttConnection } from "@/lib/services/mqtt"
import type { DeviceStatus, SensorReading } from "@/lib/types/sensor"

import { Badge } from "@/components/ui/badge"
import { EspSelector } from "@/components/EspSelector"
import { MetricsCards } from "@/components/dashboard/MetricsCards"
import { ChartsContainer } from "@/components/dashboard/ChartsContainer"

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

export function DashboardTab({ selectedDevice: controlledDevice, onDeviceChange }: DashboardTabProps = {}) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  
  const [deviceReading, setDeviceReading] = useState<SensorReading[]>([])
  const [deviceStatus, setDeviceStatus] = useState<Record<string, boolean>>({})
  const [device, setDevice] = useState("ESP32-DEV")

  const currentDevice = controlledDevice ?? device

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await fetchReadings(100)

        if (data.length > 0) {
          setReadings(data)
        }
      } catch (e) {
        console.error("Falha ao carregar telemetria do Supabase:", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])



  // Executado sempre que uma nova medição válida é recebida.
  const handleNewReading = useCallback((reading: SensorReading) => {
    if (
      !reading.deviceId ||
      !Number.isFinite(Date.parse(reading.timestamp)) ||
      reading.co2 <= 0 ||
      reading.humidity < 0 ||
      reading.humidity > 100 ||
      reading.temperature < -40 ||
      reading.temperature > 90
    ) {
      return
    }

    setDeviceReading((previous) => [
      reading,
      ...previous,
    ].slice(0, 100))
  }, [])

  const handleDeviceStatus = useCallback((status: DeviceStatus) => {
    setDeviceStatus((previous) => ({
      ...previous,
      [status.deviceId]: status.online,
    }))
  }, [])

  // Abre a conexão e a encerra quando o componente é desmontado.
  useEffect(() => {
    return initMqttConnection(handleNewReading, handleDeviceStatus)
  }, [handleNewReading, handleDeviceStatus])

  // Lista dinâmica de dispositivos, incluindo os recebidos via MQTT.
  const availableDevices = useMemo(() => {
    const devices = Array.from(
      new Set([...readings, ...deviceReading].map((r) => r.deviceId))
    )

    return devices.length > 0 ? devices : ["ESP32-SALA-101", "ESP32-SALA-204", "ESP32-LAB-INFO"]
  }, [readings, deviceReading])

  function handleDeviceChange(device: string) {
    if (onDeviceChange) {
      onDeviceChange(device)
    } else {
      setDevice(device)
    }
  }

  useEffect(() => {
    if (availableDevices.length > 0 && !availableDevices.includes(currentDevice)) {
      handleDeviceChange(availableDevices[0])
    }
  }, [availableDevices, currentDevice])

  // Combina leituras em tempo real com o histórico carregado do Supabase
  const filteredReadings = useMemo(() => {
    return [...deviceReading, ...readings]
      .filter((reading) => reading.deviceId === currentDevice)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      )
  }, [currentDevice, deviceReading, readings])

  // A leitura mais recente é usada pelos três cards.
  const currentReading = filteredReadings[0]

  const hasRealtimeReading = deviceReading.some(
    (reading) =>
      reading.id === currentReading?.id &&
      reading.deviceId === currentDevice
  )

  // Status de conexão direto do broker MQTT
  const isOnline = Boolean(deviceStatus[currentDevice])

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
                ? "Tempo real (MQTT)"
                : "Histórico (Supabase)"}
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
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground bg-white dark:bg-card border rounded-2xl shadow-sm">
          <span className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span>Sincronizando telemetria com o banco de dados...</span>
        </div>
      ) : (
        <>
          <MetricsCards reading={currentReading} />

          <ChartsContainer readings={filteredReadings} />
        </>
      )}
    </div>
  )
}


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

const REFRESH_INTERVAL = 5000
const MAX_READINGS = 100

function formatLastUpdate(dateString: string): string {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return dateString
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export function DashboardTab({
  selectedDevice: controlledDevice,
  onDeviceChange,
}: DashboardTabProps = {}) {
  // Histórico recuperado do Supabase.
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Medições e status recebidos pelo MQTT.
  const [deviceReading, setDeviceReading] = useState<SensorReading[]>([])
  const [deviceStatus, setDeviceStatus] = useState<
    Record<string, boolean>
  >({})

  // Dispositivo selecionado no Dashboard.
  const [device, setDevice] = useState("ESP32-DEV")

  const currentDevice = controlledDevice ?? device

  // -------------------------------------------------------
  // SUPABASE: CONSULTA AUTOMÁTICA A CADA 5 SEGUNDOS
  // -------------------------------------------------------

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    async function loadData() {
      try {
        // Busca as 100 medições mais recentes do banco.
        const data = await fetchReadings(MAX_READINGS)

        if (cancelled) return

        // Atualiza os registros quando existem resultados.
        // A lista anterior é mantida caso uma consulta
        // temporariamente não retorne medições.
        if (data.length > 0) {
          setReadings(data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "[Supabase] Falha ao atualizar medições:",
            error
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)

          // Agenda a próxima busca após terminar a atual.
          // Evita consultas sobrepostas.
          timeoutId = setTimeout(
            loadData,
            REFRESH_INTERVAL
          )
        }
      }
    }

    // Primeira consulta assim que o Dashboard é aberto.
    void loadData()

    // Encerra a atualização ao sair do Dashboard.
    return () => {
      cancelled = true

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  // -------------------------------------------------------
  // MQTT: RECEBIMENTO DE NOVAS MEDIÇÕES
  // -------------------------------------------------------

  const handleNewReading = useCallback(
    (reading: SensorReading) => {
      if (
        !reading.deviceId ||
        !Number.isFinite(Date.parse(reading.timestamp)) ||
        !Number.isFinite(reading.co2) ||
        !Number.isFinite(reading.temperature) ||
        !Number.isFinite(reading.humidity) ||
        reading.co2 <= 0 ||
        reading.humidity < 0 ||
        reading.humidity > 100 ||
        reading.temperature < -40 ||
        reading.temperature > 90
      ) {
        console.warn(
          "[MQTT] Medição inválida descartada:",
          reading
        )
        return
      }

      setDeviceReading((previous) => [
        reading,
        ...previous,
      ].slice(0, MAX_READINGS))
    },
    []
  )

  // -------------------------------------------------------
  // MQTT: STATUS ONLINE / OFFLINE
  // -------------------------------------------------------

  const handleDeviceStatus = useCallback(
    (status: DeviceStatus) => {
      setDeviceStatus((previous) => ({
        ...previous,
        [status.deviceId]: status.online,
      }))
    },
    []
  )

  // Inicializa a conexão MQTT e encerra quando
  // o Dashboard é desmontado.
  useEffect(() => {
    return initMqttConnection(
      handleNewReading,
      handleDeviceStatus
    )
  }, [handleNewReading, handleDeviceStatus])

  // -------------------------------------------------------
  // DISPOSITIVOS DISPONÍVEIS
  // -------------------------------------------------------

  const availableDevices = useMemo(() => {
    const devices = Array.from(
      new Set(
        [...readings, ...deviceReading].map(
          (reading) => reading.deviceId
        )
      )
    )

    return devices.length > 0
      ? devices
      : [
          "ESP32-SALA-101",
          "ESP32-SALA-204",
          "ESP32-LAB-INFO",
        ]
  }, [readings, deviceReading])

  function handleDeviceChange(selected: string) {
    if (onDeviceChange) {
      onDeviceChange(selected)
    } else {
      setDevice(selected)
    }
  }

  // Seleciona um dispositivo disponível quando
  // o selecionado não estiver presente.
  useEffect(() => {
    if (
      availableDevices.length > 0 &&
      !availableDevices.includes(currentDevice)
    ) {
      handleDeviceChange(availableDevices[0])
    }
  }, [availableDevices, currentDevice])

  // -------------------------------------------------------
  // COMBINA SUPABASE E MQTT
  // -------------------------------------------------------

  const filteredReadings = useMemo(() => {
    const combined = [
      ...deviceReading,
      ...readings,
    ].filter(
      (reading) =>
        reading.deviceId === currentDevice
    )

    // Evita repetir a mesma medição quando ela
    // aparece pelo MQTT e depois pelo Supabase.
    const uniqueReadings = new Map<string, SensorReading>()

    for (const reading of combined) {
      const key = [
        reading.deviceId,
        reading.timestamp,
        reading.co2,
        reading.temperature,
        reading.humidity,
      ].join("|")

      if (!uniqueReadings.has(key)) {
        uniqueReadings.set(key, reading)
      }
    }

    return Array.from(uniqueReadings.values())
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      )
      .slice(0, MAX_READINGS)
  }, [currentDevice, deviceReading, readings])

  // Leitura mais recente usada nos cards.
  const currentReading = filteredReadings[0]

  // Indica se a leitura mais recente chegou via MQTT.
  const hasRealtimeReading = deviceReading.some(
    (reading) =>
      reading.deviceId === currentDevice &&
      reading.timestamp === currentReading?.timestamp &&
      reading.co2 === currentReading?.co2 &&
      reading.temperature === currentReading?.temperature &&
      reading.humidity === currentReading?.humidity
  )

  // O status é informado pelo broker MQTT.
  const isOnline = Boolean(deviceStatus[currentDevice])

  // -------------------------------------------------------
  // INTERFACE DO DASHBOARD
  // -------------------------------------------------------

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
                Última leitura:{" "}
                {formatLastUpdate(
                  currentReading.timestamp
                )}
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
                isOnline
                  ? "bg-emerald-500"
                  : "bg-slate-400"
              )}
            />

            <span>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground bg-white dark:bg-card border rounded-2xl shadow-sm">
          <span className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />

          <span>
            Sincronizando telemetria com o banco de dados...
          </span>
        </div>
      ) : (
        <>
          <MetricsCards reading={currentReading} />

          <ChartsContainer
            readings={filteredReadings}
          />
        </>
      )}
    </div>
  )
}

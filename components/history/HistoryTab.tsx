"use client"

import React, { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"

import { fetchReadings } from "@/lib/services/supabase"
import type { SensorReading } from "@/lib/types/sensor"

import { CriticalAlerts } from "@/components/history/CriticalAlerts"
import { HistoryFilters } from "@/components/history/HistoryFilters"
import { HistoryTable } from "@/components/history/HistoryTable"
import { AirPieChart } from "@/components/history/AirPieChart"
import { historyMock } from "@/lib/mocks/readingsMock"

export function HistoryTab() {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const data = await fetchReadings(100);

        if (data.length > 0) {
          setReadings(data)
        }
      } catch (e) {
        console.error("Falha ao carregar do Supabase:", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, []) // O array vazio diz para executar apenas uma vez quando a aba for exibida


  // Estados para os filtros
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedDevice, setSelectedDevice] = useState<string>("all")
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false)

  // Lista dinâmica de dispositivos presentes no mock/banco
  const availableDevices = useMemo(() => {
    const devices = Array.from(new Set(readings.map((r) => r.deviceId)))
    return devices.length > 0 ? devices : ["ESP32-DEV", "ESP32-SALA-01", "ESP32-LAB-02"]
  }, [readings])

  // Aplicação dos filtros sobre a lista de leituras
  const filteredReadings = useMemo(() => {
    return readings.filter((reading) => {
      // Filtro por sensor / dispositivo
      if (selectedDevice !== "all" && reading.deviceId !== selectedDevice) return false

      // Filtro por leitura crítica (> 1200 ppm)
      if (onlyCritical && reading.co2 <= 1200) return false

      // Filtro por data inicial
      if (startDate) {
        const readingTime = new Date(reading.timestamp).getTime()
        const startTime = new Date(`${startDate}T00:00:00`).getTime()
        if (readingTime < startTime) return false
      }

      // Filtro por data final
      if (endDate) {
        const readingTime = new Date(reading.timestamp).getTime()
        const endTime = new Date(`${endDate}T23:59:59`).getTime()
        if (readingTime > endTime) return false
      }

      return true
    })
  }, [readings, startDate, endDate, selectedDevice, onlyCritical])

  // Indicadores consolidados para os cards superiores
  const totalReadings = filteredReadings.length
  const avgCo2 =
    totalReadings > 0
      ? Math.round(filteredReadings.reduce((sum, item) => sum + item.co2, 0) / totalReadings)
      : 0
  const avgTemperature =
    totalReadings > 0
      ? Number((filteredReadings.reduce((sum, item) => sum + item.temperature, 0) / totalReadings).toFixed(1))
      : 0
  const avgHumidity =
    totalReadings > 0
      ? Math.round(filteredReadings.reduce((sum, item) => sum + item.humidity, 0) / totalReadings)
      : 0
  const criticalCount = filteredReadings.filter((item) => item.co2 > 1200).length

  // Função para resetar todos os filtros
  function handleClearFilters() {
    setStartDate("")
    setEndDate("")
    setSelectedDevice("all")
    setOnlyCritical(false)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Título da Aba */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Histórico de Medições
        </h2>
        <p className="text-sm text-muted-foreground">
          Auditoria completa das condições ambientais e alertas críticos.
        </p>
      </div>

      {/* Resumo do Topo (Carrossel no Mobile, Grid no Desktop) */}
      <CriticalAlerts
        totalReadings={totalReadings}
        avgCo2={avgCo2}
        avgTemperature={avgTemperature}
        avgHumidity={avgHumidity}
        criticalCount={criticalCount}
        onlyCritical={onlyCritical}
        isLoading={isLoading}
      />

      {/* Barra de Filtros (Datas, Dispositivo e Críticas) */}
      <HistoryFilters
        startDate={startDate}
        endDate={endDate}
        selectedDevice={selectedDevice}
        onlyCritical={onlyCritical}
        availableDevices={availableDevices}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onDeviceChange={setSelectedDevice}
        onToggleOnlyCritical={() => setOnlyCritical((prev) => !prev)}
        onClearFilters={handleClearFilters}
      />

      {/* Seção Principal: No modo "Apenas Críticas", oculta o gráfico de proporção (100% crítico) e expande a tabela */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={cn(onlyCritical ? "lg:col-span-12" : "lg:col-span-7")}>
          <HistoryTable readings={filteredReadings} onlyCritical={onlyCritical} isLoading={isLoading} />
        </div>

        {!onlyCritical && (
          <div className="lg:col-span-5">
            <AirPieChart readings={filteredReadings} isLoading={isLoading} />
          </div>
        )}
      </div>
    </div>
  )
}

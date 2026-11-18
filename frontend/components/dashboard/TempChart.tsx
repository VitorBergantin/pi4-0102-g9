"use client"

import { SensorLineChart, type SensorChartProps } from "@/components/dashboard/SensorLineChart"

export function TempChart({ readings }: SensorChartProps) {
  return (
    <SensorLineChart
      readings={readings}
      title="Temperatura"
      dataKey="temperature"
      unit="°C"
      color="#2563eb"
    />
  )
}

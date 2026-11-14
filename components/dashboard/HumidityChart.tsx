"use client"

import { SensorLineChart, type SensorChartProps } from "@/components/dashboard/SensorLineChart"

export function HumidityChart({ readings }: SensorChartProps) {
  return (
    <SensorLineChart
      readings={readings}
      title="Umidade"
      dataKey="humidity"
      unit="%"
      color="#0891b2"
    />
  )
}

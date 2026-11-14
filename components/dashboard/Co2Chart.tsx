"use client"

import { SensorLineChart, type SensorChartProps } from "@/components/dashboard/SensorLineChart"

export function Co2Chart({ readings }: SensorChartProps) {
  return (
    <SensorLineChart
      readings={readings}
      title="Concentração de CO₂"
      dataKey="co2"
      unit="ppm"
      color="#059669"
      featured
    />
  )
}

"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SensorReading } from "@/lib/types/sensor"

export interface SensorChartProps {
  readings: readonly SensorReading[]
}

interface SensorLineChartProps extends SensorChartProps {
  title: string
  dataKey: "co2" | "temperature" | "humidity"
  unit: string
  color: string
  featured?: boolean
}

const shortTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
})

const numberFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
})

export function SensorLineChart({
  readings,
  title,
  dataKey,
  unit,
  color,
  featured = false,
}: SensorLineChartProps) {
  const data = readings.map((reading) => ({
    timestamp: new Date(reading.timestamp).getTime(),
    value: reading[dataKey],
  }))

  const latestValue = data.length > 0 ? data[data.length - 1].value : null

  return (
    <Card
      aria-label={`${title} ao longo do tempo`}
      className={cn(
        "rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden transition-all",
        featured && "border-emerald-500/40 ring-1 ring-emerald-500/15"
      )}
    >
      <CardHeader className="pb-2 border-b border-border/60 flex flex-row items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className={cn("font-bold text-foreground", featured ? "text-base" : "text-sm")}>
              {title}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
             Monitoramento contínuo ({unit})
          </CardDescription>
        </div>

        {latestValue !== null && (
          <Badge
            variant="outline"
            className="font-mono text-xs px-2.5 py-0.5 bg-muted/50 text-foreground border-border"
          >
            {numberFormat.format(latestValue)} {unit}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        <div
          className={cn(
            "w-full min-w-0 text-xs text-muted-foreground",
            featured ? "h-72" : "h-56"
          )}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, bottom: 16, left: 0 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value: number) => shortTimeFormat.format(value)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                label={{
                  value: "Horário da medição",
                  position: "insideBottom",
                  offset: -10,
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <YAxis
                width={80}
                tickFormatter={(value: number) =>
                  `${numberFormat.format(value)} ${unit}`
                }
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                labelFormatter={(value) => dateTimeFormat.format(Number(value))}
                formatter={(value) => [
                  `${numberFormat.format(Number(value))} ${unit}`,
                  title,
                ]}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={title}
                stroke={color}
                strokeWidth={featured ? 2.5 : 2}
                dot={data.length <= 1 ? { r: 4, fill: color } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: color, fill: "white" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

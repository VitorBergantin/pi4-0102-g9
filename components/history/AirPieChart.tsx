"use client"

import { PieChart, Pie, Sector, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { SensorReading } from "@/lib/types/sensor"

interface PieChartProps {
  readings?: SensorReading[]
}

interface CustomLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
  payload?: {
    shortName: string
    name: string
    count: number
    color: string
  }
}

const RADIAN = Math.PI / 180

// Renderiza o percentual dentro do anel e a linha guia com label flutuante
function renderPieLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, payload }: CustomLabelProps) {
  if (!payload || percent <= 0) return null

  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)

  // Posição do percentual (no centro se for fatia única de 100%, ou no meio do anel)
  const isSingleSlice = percent >= 0.999
  const midRadius = innerRadius + (outerRadius - innerRadius) * 0.5
  const px = isSingleSlice ? cx : cx + midRadius * cos
  const py = isSingleSlice ? cy : cy + midRadius * sin
  const percentageText = `${Math.round(percent * 100)}%`

  // Ponto de partida na borda externa da fatia
  const sx = cx + outerRadius * cos
  const sy = cy + outerRadius * sin

  // Cotovelo da linha diagonal
  const mx = cx + (outerRadius + 18) * cos
  const my = cy + (outerRadius + 18) * sin

  // Reta horizontal para a direita (cos >= 0) ou esquerda (cos < 0)
  const dir = cos >= 0 ? 1 : -1
  const lineLength = 68
  const ex = mx + dir * lineLength
  const ey = my

  // Posição da label flutuante acima da reta horizontal
  const textX = mx + dir * (lineLength / 2)
  const textY = ey - 7

  return (
    <g>
      {/* Percentual dentro da fatia (ou no centro se for 100%) */}
      {percent >= 0.06 && (
        <text
          x={px}
          y={py}
          fill={isSingleSlice ? payload.color : "#ffffff"}
          textAnchor="middle"
          dominantBaseline="central"
          className={isSingleSlice ? "text-base font-bold select-none" : "text-xs font-bold select-none"}
          style={isSingleSlice ? undefined : { textShadow: "0px 1px 2px rgba(0, 0, 0, 0.45)" }}
        >
          {percentageText}
        </text>
      )}

      {/* Linha guia ligada à cor da fatia */}
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={payload.color}
        strokeWidth={1.5}
        fill="none"
      />

      {/* Ponto circular na borda da fatia */}
      <circle
        cx={sx}
        cy={sy}
        r={4}
        fill={payload.color}
        stroke="var(--card)"
        strokeWidth={1.5}
      />

      {/* Traço vertical na extremidade da linha */}
      <line
        x1={ex}
        y1={ey - 4}
        x2={ex}
        y2={ey + 4}
        stroke={payload.color}
        strokeWidth={1.5}
      />

      {/* Nome da categoria flutuando sobre a linha */}
      <text
        x={textX}
        y={textY}
        textAnchor="middle"
        className="text-xs font-semibold fill-foreground select-none"
      >
        {payload.shortName}
      </text>
    </g>
  )
}

export function AirPieChart({ readings = [] }: PieChartProps) {
  const total = readings.length

  const goodCount = readings.filter((r) => r.co2 < 800).length
  const moderateCount = readings.filter((r) => r.co2 >= 800 && r.co2 <= 1200).length
  const criticalCount = readings.filter((r) => r.co2 > 1200).length

  const chartData = [
    {
      shortName: "Bom",
      name: "Bom (< 800 ppm)",
      value: goodCount,
      count: goodCount,
      color: "#147568", // Verde Pinheiro / Principal
    },
    {
      shortName: "Moderado",
      name: "Moderado (800-1200 ppm)",
      value: moderateCount,
      count: moderateCount,
      color: "#eab308", // Amarelo Atenção
    },
    {
      shortName: "Crítico",
      name: "Crítico (> 1200 ppm)",
      value: criticalCount,
      count: criticalCount,
      color: "#ef4444", // Vermelho Alerta
    },
  ].filter((item) => item.count > 0)

  function calculatePercentage(count: number) {
    if (total === 0) return "0%"
    return `${Math.round((count / total) * 100)}%`
  }

  return (
    <Card className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm h-full flex flex-col">
      <CardHeader className="pb-2 border-b border-border/60">
        <CardTitle className="text-sm font-bold text-foreground">
          Qualidade do Ar
        </CardTitle>

        <CardDescription className="text-xs text-muted-foreground">
          Proporção das medições no período
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex items-center justify-center p-4">
        {total === 0 ? (
          <div className="h-75 flex items-center justify-center text-xs text-muted-foreground">
            Sem dados para o gráfico
          </div>
        ) : (
          <div className="h-75 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-1.5 shadow-md text-xs">
                          <p className="font-semibold text-foreground">{data.name}</p>
                          <p className="text-muted-foreground">
                            {data.count} leituras ({calculatePercentage(data.count)})
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                  shape={(props) => (
                    <Sector
                      {...props}
                      fill={props.payload?.color ?? props.fill}
                      stroke="none"
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import React from "react"
import { cn } from "@/lib/utils"

interface IndicatorCardProps {
  title: string
  value: string | number
  unit: string
  className?: string
}

// Cartão de métrica com linha superior decorativa e variáveis do shadcn
export function IndicatorCard({
  title,
  value,
  unit,
  className,
}: IndicatorCardProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[17px] border border-border bg-card p-6.75 shadow-[0_5px_16px_rgba(25,53,54,0.045)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(25,53,54,0.09)]",
        className
      )}
    >
      {/* Linha superior decorativa em degradê baseada nas variáveis de cor */}
      <div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-primary to-ring" />

      <h3 className="mb-5 text-[15px] font-semibold text-muted-foreground">
        {title}
      </h3>

      <div className="flex items-baseline gap-1 text-muted-foreground">
        <strong className="text-[35px] font-bold tracking-tight text-foreground">
          {value}
        </strong>{" "}
        <span className="text-[15px] font-normal">{unit}</span>
      </div>
    </article>
  )
}

export default IndicatorCard

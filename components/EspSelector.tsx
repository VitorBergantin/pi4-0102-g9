"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface EspSelectorProps {
  selectedDevice: string
  availableDevices?: string[]
  onDeviceChange?: (device: string) => void
  showAllOption?: boolean
  layout?: "inline" | "stacked"
  className?: string
}

export function EspSelector({
  selectedDevice,
  availableDevices = ["ESP32-DEV", "ESP32-SALA-01", "ESP32-LAB-02"],
  onDeviceChange,
  showAllOption = false,
  layout = "inline",
  className,
}: EspSelectorProps) {
  const isStacked = layout === "stacked"
  const displayLabel =
    selectedDevice === "all" ? "Todos os sensores" : selectedDevice

  return (
    <div
      className={cn(
        isStacked
          ? "flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"
          : "flex items-center gap-2.5",
        className
      )}
    >
      <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
        {isStacked ? "Dispositivo" : "Dispositivo:"}
      </span>

      <Select
        value={selectedDevice}
        onValueChange={(val) =>
          onDeviceChange?.(val ?? (showAllOption ? "all" : availableDevices[0]))
        }
      >
        <SelectTrigger
          className={cn(
            "h-9 text-xs font-medium shadow-2xs",
            isStacked ? "w-full rounded-lg bg-background" : "min-w-42.5 rounded-xl bg-card"
          )}
        >
          <SelectValue placeholder="Selecione o sensor">
            {displayLabel}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {showAllOption && (
            <SelectItem value="all" className="text-xs">
              Todos os sensores
            </SelectItem>
          )}
          {availableDevices.map((device) => (
            <SelectItem key={device} value={device} className="text-xs">
              {device}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

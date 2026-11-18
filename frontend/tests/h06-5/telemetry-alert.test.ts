import { describe, expect, it } from "vitest"
import { CRITICAL_CO2_PPM, isCriticalCo2 } from "@/lib/air-quality"
import { applyInternalAlertUpdate } from "@/lib/dashboard/alert-state"
import { createTelemetryAlertUpdate } from "@/lib/dashboard/telemetry-alert"
import type { SensorReading } from "@/lib/types/sensor"

const reading: SensorReading = {
  id: "test", deviceId: "A", timestamp: "2026-11-16T12:00:00Z",
  co2: 1400, temperature: 24, humidity: 50,
}

describe("classificação local da telemetria", () => {
  it.each([1199, 1200, 1200.1, 1400])("classifica CO₂ %s com a regra compartilhada", co2 => {
    expect(CRITICAL_CO2_PPM).toBe(1200)
    expect(isCriticalCo2(co2)).toBe(co2 > 1200)
    expect(createTelemetryAlertUpdate({ ...reading, co2 })?.state.status)
      .toBe(co2 > 1200 ? "active" : "inactive")
  })

  it("usa o instante da medição, inclusive offsets equivalentes", () => {
    const utc = createTelemetryAlertUpdate(reading)
    const offset = createTelemetryAlertUpdate({ ...reading, timestamp: "2026-11-16T09:00:00-03:00" })
    expect(offset).toEqual(utc)
    expect(utc?.state.revision).toBe(Date.parse(reading.timestamp))
    const states = applyInternalAlertUpdate({}, utc)
    expect(applyInternalAlertUpdate(states, offset)).toBe(states)
  })

  it.each([
    { deviceId: "" }, { deviceId: " " }, { deviceId: " A " }, { deviceId: 1 },
    { timestamp: "" }, { timestamp: "inválido" }, { timestamp: null },
    { co2: NaN }, { co2: Infinity }, { co2: "1400" }, { co2: 0 }, { co2: -1 },
    { temperature: NaN }, { temperature: Infinity }, { temperature: -41 }, { temperature: 91 },
    { humidity: NaN }, { humidity: Infinity }, { humidity: -1 }, { humidity: 101 },
  ])("rejeita leitura inválida %j", changes => {
    expect(createTelemetryAlertUpdate({ ...reading, ...changes } as SensorReading)).toBeNull()
  })
})

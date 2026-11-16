import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardActiveAlert } from "@/components/dashboard/DashboardActiveAlert"
import { DashboardTab } from "@/components/dashboard/DashboardTab"
import { applyInternalAlertUpdate, type DeviceAlertStates } from "@/lib/dashboard/alert-state"
import { fetchReadings } from "@/lib/services/supabase"
import { initMqttConnection } from "@/lib/services/mqtt"
import type { SensorReading } from "@/lib/types/sensor"

// Serviços externos ficam isolados: estas fixtures não representam CT7.
vi.mock("@/lib/services/supabase", () => ({ fetchReadings: vi.fn() }))
vi.mock("@/lib/services/mqtt", () => ({ initMqttConnection: vi.fn() }))
// Gráficos dependem de layout do navegador, indisponível no jsdom.
vi.mock("@/components/dashboard/ChartsContainer", () => ({
  ChartsContainer: ({ readings }: { readings: SensorReading[] }) => (
    <div data-testid="charts">{readings.map(r => `${r.deviceId}:${r.co2}`).join(",")}</div>
  ),
}))

const activeStates: DeviceAlertStates = {
  A: { status: "active", revision: 1, co2: 600 },
  B: { status: "inactive", revision: 2 },
  C: { status: "unknown" },
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("banner de alerta interno", () => {
  it("exibe conteúdo acessível sem depender do valor crítico de CO₂", () => {
    render(<DashboardActiveAlert deviceId="A" alertStates={activeStates} />)
    const alert = screen.getByRole("alert")
    expect(alert.getAttribute("aria-live")).toBe("assertive")
    expect(within(alert).getByRole("heading", { name: "Alerta de qualidade do ar ativo" })).toBeDefined()
    expect(alert.textContent).toContain("dispositivo A")
    expect(alert.textContent).toContain("600 ppm")
    expect(alert.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
  })

  it.each(["B", "C", "ausente"])("não exibe banner para %s", deviceId => {
    render(<DashboardActiveAlert deviceId={deviceId} alertStates={activeStates} />)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("não exibe banner quando nenhum mapa é fornecido", () => {
    render(<DashboardActiveAlert deviceId="A" />)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("alterna entre dispositivos sem perder o alerta anterior", () => {
    const { rerender } = render(<DashboardActiveAlert deviceId="A" alertStates={activeStates} />)
    expect(screen.getByRole("alert").textContent).toContain("dispositivo A")
    rerender(<DashboardActiveAlert deviceId="B" alertStates={activeStates} />)
    expect(screen.queryByRole("alert")).toBeNull()
    rerender(<DashboardActiveAlert deviceId="A" alertStates={activeStates} />)
    expect(screen.getAllByRole("alert")).toHaveLength(1)
  })

  it("desativa e ignora reativação antiga, duplicada ou inválida", () => {
    let states = applyInternalAlertUpdate({}, {
      deviceId: "A", state: { status: "active", revision: 1, co2: 600 },
    })
    const { rerender } = render(<DashboardActiveAlert deviceId="A" alertStates={states} />)
    const alert = screen.getByRole("alert")
    states = applyInternalAlertUpdate(states, {
      deviceId: "A", state: { status: "active", revision: 1, co2: 999 },
    })
    rerender(<DashboardActiveAlert deviceId="A" alertStates={states} />)
    expect(screen.getByRole("alert")).toBe(alert)
    expect(alert.textContent).toContain("600 ppm")
    states = applyInternalAlertUpdate(states, {
      deviceId: "A", state: { status: "inactive", revision: 2 },
    })
    rerender(<DashboardActiveAlert deviceId="A" alertStates={states} />)
    expect(screen.queryByRole("alert")).toBeNull()
    for (const update of [
      { deviceId: "A", state: { status: "active", revision: 1, co2: 600 } },
      { deviceId: "A", state: { status: "active", revision: 2, co2: 600 } },
      { deviceId: "A", state: { status: "active", revision: 3, co2: NaN } },
    ]) {
      states = applyInternalAlertUpdate(states, update)
      rerender(<DashboardActiveAlert deviceId="A" alertStates={states} />)
      expect(screen.queryByRole("alert")).toBeNull()
    }
  })
})

describe("dashboard com estados internos opcionais", () => {
  const stopMqtt = vi.fn()
  const historical: SensorReading[] = ["A", "B"].map(deviceId => ({
    id: deviceId, deviceId, timestamp: "2026-11-16T12:00:00Z",
    co2: 700, temperature: 24, humidity: 50,
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchReadings).mockResolvedValue(historical)
    vi.mocked(initMqttConnection).mockReturnValue(stopMqtt)
  })

  it("preserva consulta, indicadores, gráficos, preferências e seleção sem estados", async () => {
    const onDeviceChange = vi.fn()
    render(<DashboardTab selectedDevice="A" onDeviceChange={onDeviceChange} />)
    expect(await screen.findByText("700")).toBeDefined()
    expect(fetchReadings).toHaveBeenCalledWith(100)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByTestId("charts").textContent).toBe("A:700")
    expect(screen.getByText("Histórico (Supabase)")).toBeDefined()
    expect(screen.getByText("Offline")).toBeDefined()
    const co2Preference = screen.getByRole("checkbox", { name: "CO₂" })
    fireEvent.click(co2Preference)
    expect(screen.queryByText("700")).toBeNull()
    fireEvent.click(co2Preference)
    expect(screen.getByText("700")).toBeDefined()
    expect(screen.getByRole("combobox")).toBeDefined()
  })

  it("mostra o banner acima dos indicadores e acompanha a seleção controlada", async () => {
    const { rerender } = render(<DashboardTab selectedDevice="A" alertStates={activeStates} />)
    await screen.findByText("700")
    expect(screen.getByRole("alert").compareDocumentPosition(screen.getByText("Indicadores visíveis"))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole("alert").textContent).toContain("600 ppm")
    rerender(<DashboardTab selectedDevice="B" alertStates={activeStates} />)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByTestId("charts").textContent).toBe("B:700")
    rerender(<DashboardTab selectedDevice="A" alertStates={activeStates} />)
    expect(screen.getByRole("alert").textContent).toContain("dispositivo A")
    expect(initMqttConnection).toHaveBeenCalledTimes(1)
  })

  it("preserva atualizações MQTT e limpeza com classificação local da telemetria", async () => {
    const { unmount } = render(<DashboardTab selectedDevice="A" />)
    await screen.findByText("700")
    const [onReading, onStatus] = vi.mocked(initMqttConnection).mock.calls[0]
    act(() => {
      onReading?.({ ...historical[0], id: "new", timestamp: "2026-11-16T12:01:00Z", co2: 1800 })
      onStatus?.({ deviceId: "A", online: true, timestamp: "2026-11-16T12:01:00Z" })
    })
    expect(screen.getByText((1800).toLocaleString("pt-BR"))).toBeDefined()
    expect(screen.getByText("Tempo real (MQTT)")).toBeDefined()
    expect(screen.getByText("Online")).toBeDefined()
    expect(screen.getByTestId("charts").textContent).toBe("A:1800,A:700")
    expect(screen.getByRole("alert").textContent).toContain("dispositivo A")
    unmount()
    expect(stopMqtt).toHaveBeenCalledOnce()
  })
})

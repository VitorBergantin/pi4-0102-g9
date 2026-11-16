import { EventEmitter } from "node:events"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardTab } from "@/components/dashboard/DashboardTab"
import { fetchReadings } from "@/lib/services/supabase"
import type { SensorReading } from "@/lib/types/sensor"

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }))
// Somente o transporte é controlado. O parser e serviço MQTT são os reais.
vi.mock("mqtt", () => ({ default: { connect } }))
vi.mock("@/lib/services/supabase", () => ({ fetchReadings: vi.fn() }))
vi.mock("@/components/dashboard/ChartsContainer", () => ({
  ChartsContainer: ({ readings }: { readings: SensorReading[] }) => (
    <div data-testid="charts">{readings.map(r => `${r.deviceId}:${r.co2}`).join(",")}</div>
  ),
}))

class BrokerClient extends EventEmitter {
  disconnecting = false
  subscribe = vi.fn((_topics: string[], callback: (error: null) => void) => callback(null))
  end = vi.fn()
}

let client: BrokerClient

function publish(deviceId: string, co2: number, measuredAt: string) {
  message(deviceId, { deviceId, co2, measuredAt, temperature: 24, humidity: 50 })
}

function message(deviceId: string, payload: unknown) {
  act(() => {
    client.emit("message", `co2nect/${deviceId}/telemetry`, Buffer.from(JSON.stringify(payload)))
  })
}

async function dashboard(props: Parameters<typeof DashboardTab>[0] = {}) {
  const result = render(<DashboardTab selectedDevice="A" {...props} />)
  await screen.findByText("Indicadores visíveis")
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
  client = new BrokerClient()
  connect.mockReturnValue(client)
  vi.mocked(fetchReadings).mockResolvedValue(["A", "B"].map(deviceId => ({
    id: deviceId, deviceId, timestamp: "2026-11-16T11:59:00Z",
    co2: 700, temperature: 24, humidity: 50,
  })))
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe("MQTT → parser real → dashboard → alerta", () => {
  it("DEMONSTRAÇÃO: ativa, mantém crítico e desativa em 1200 ppm com medição posterior", async () => {
    await dashboard()
    expect(screen.queryByRole("alert")).toBeNull()
    publish("A", 1400, "2026-11-16T12:00:00Z")
    expect(screen.getByRole("alert").textContent).toContain("1.400 ppm")
    expect(screen.getByText("Alerta: concentração crítica")).toBeDefined()
    expect(screen.getByText("Tempo real (MQTT)")).toBeDefined()
    expect(screen.getByTestId("charts").textContent).toBe("A:1400,A:700")

    publish("A", 1500, "2026-11-16T12:01:00Z")
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByRole("alert").textContent).toContain("1.500 ppm")

    publish("A", 1200, "2026-11-16T12:02:00Z")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("Atenção: ventilação recomendada")).toBeDefined()
    expect(screen.getByText((1200).toLocaleString("pt-BR"))).toBeDefined()
    expect(screen.getByTestId("charts").textContent).toBe("A:1200,A:1500,A:1400,A:700")
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it("não reativa com medição crítica antiga, nem com timestamp empatado", async () => {
    await dashboard()
    publish("A", 900, "2026-11-16T12:02:00Z")
    publish("A", 1800, "2026-11-16T12:01:00Z")
    publish("A", 1900, "2026-11-16T12:02:00Z")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("900")).toBeDefined()
    expect(screen.getByTestId("charts").textContent).toBe("A:900,A:1800,A:700")
  })

  it("não encerra com medição normal antiga, nem duplica leituras repetidas", async () => {
    await dashboard()
    publish("A", 1800, "2026-11-16T12:02:00Z")
    publish("A", 900, "2026-11-16T12:01:00Z")
    publish("A", 1800, "2026-11-16T12:02:00Z")
    publish("A", 900, "2026-11-16T09:02:00-03:00")
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByRole("alert").textContent).toContain("1.800 ppm")
    expect(screen.getByText("Alerta: concentração crítica")).toBeDefined()
    expect(screen.getByTestId("charts").textContent).toBe("A:1800,A:900,A:700")
  })

  it("seleciona o estado de cada dispositivo com ordenação independente", async () => {
    const { rerender } = await dashboard()
    publish("A", 1800, "2026-11-16T12:02:00Z")
    publish("B", 900, "2026-11-16T12:00:00Z")
    expect(screen.getByRole("alert").textContent).toContain("dispositivo A")
    rerender(<DashboardTab selectedDevice="B" />)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByTestId("charts").textContent).toBe("B:900,B:700")
    publish("B", 1500, "2026-11-16T12:01:00Z")
    expect(screen.getByRole("alert").textContent).toContain("dispositivo B")
    publish("A", 800, "2026-11-16T12:03:00Z")
    expect(screen.getByRole("alert").textContent).toContain("dispositivo B")
    rerender(<DashboardTab selectedDevice="A" />)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it("rejeita mensagens inválidas sem corromper alertas, cards ou gráficos", async () => {
    await dashboard()
    publish("A", 1800, "2026-11-16T12:00:00Z")
    const valid = { deviceId: "A", co2: 800, temperature: 24, humidity: 50, measuredAt: "2026-11-16T12:01:00Z" }
    for (const payload of [
      null, [], 42,
      { ...valid, measuredAt: undefined }, { ...valid, measuredAt: "" },
      { ...valid, measuredAt: "inválido" }, { ...valid, co2: null },
      { ...valid, co2: "800" }, { ...valid, temperature: null },
      { ...valid, temperature: 91 }, { ...valid, humidity: 101 },
      { ...valid, co2: 0 }, { ...valid, deviceId: 1 },
    ]) message("A", payload)
    act(() => client.emit("message", "co2nect/A/telemetry", Buffer.from("{JSON inválido")))
    expect(screen.getByRole("alert").textContent).toContain("1.800 ppm")
    expect(screen.getByTestId("charts").textContent).toBe("A:1800,A:700")
  })

  it("a telemetria aceita tem precedência sobre propriedades opcionais", async () => {
    await dashboard({ alertStates: { A: { status: "inactive", revision: Number.MAX_SAFE_INTEGER } } })
    publish("A", 1800, "2026-11-16T12:00:00Z")
    expect(screen.getByRole("alert")).toBeDefined()
    publish("A", 800, "2026-11-16T12:01:00Z")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("mantém estado e ordenação durante reconexão da mesma montagem", async () => {
    await dashboard()
    act(() => client.emit("connect"))
    publish("A", 1800, "2026-11-16T12:02:00Z")
    act(() => {
      client.emit("offline")
      client.emit("connect")
    })
    expect(screen.getByRole("alert")).toBeDefined()
    expect(client.subscribe).toHaveBeenCalledTimes(2)
    expect(client.subscribe.mock.calls[1][0]).toEqual(["co2nect/+/telemetry", "co2nect/+/status"])
    publish("A", 800, "2026-11-16T12:01:00Z")
    expect(screen.getByRole("alert")).toBeDefined()
    publish("A", 800, "2026-11-16T12:03:00Z")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it("reinicia desconhecido ao remontar a aba e aguarda nova telemetria", async () => {
    const first = await dashboard()
    publish("A", 1800, "2026-11-16T12:00:00Z")
    expect(screen.getByRole("alert")).toBeDefined()
    first.unmount()
    expect(client.end).toHaveBeenCalledTimes(1)
    client = new BrokerClient()
    connect.mockReturnValue(client)
    await dashboard()
    expect(screen.queryByRole("alert")).toBeNull()
    publish("A", 1800, "2026-11-16T12:01:00Z")
    const alert = screen.getByRole("alert")
    expect(within(alert).getByRole("heading", { name: "Alerta de qualidade do ar ativo" })).toBeDefined()
    expect(alert.getAttribute("aria-live")).toBe("assertive")
    expect(connect).toHaveBeenCalledTimes(2)
  })
})

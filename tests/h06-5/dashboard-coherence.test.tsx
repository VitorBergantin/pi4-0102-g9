import { EventEmitter } from "node:events"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardTab } from "@/components/dashboard/DashboardTab"
import { DashboardActiveAlert } from "@/components/dashboard/DashboardActiveAlert"
import { fetchReadings } from "@/lib/services/supabase"
import type { SensorReading } from "@/lib/types/sensor"

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }))
// Parser, estado, banner e cards reais; somente transporte, banco e gráficos isolados.
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

const T0 = "2026-11-16T11:59:00.000Z"
const T1 = "2026-11-16T12:00:00.000Z"
const T2 = "2026-11-16T12:01:00.000Z"
const T3 = "2026-11-16T12:02:00.000Z"
let client: BrokerClient

function reading(co2: number, timestamp = T0, deviceId = "A"): SensorReading {
  return { id: `${deviceId}-${timestamp}`, deviceId, timestamp, co2, temperature: 24, humidity: 50 }
}

function publish(co2: number, measuredAt = T1, deviceId = "A") {
  message({ deviceId, co2, measuredAt, temperature: 24, humidity: 50 }, deviceId)
}

function message(payload: unknown, deviceId = "A") {
  act(() => client.emit("message", `co2nect/${deviceId}/telemetry`, Buffer.from(JSON.stringify(payload))))
}

async function dashboard(deviceId = "A") {
  let view!: ReturnType<typeof render>
  await act(async () => { view = render(<DashboardTab selectedDevice={deviceId} />) })
  return view
}

async function refresh(data: SensorReading[]) {
  vi.mocked(fetchReadings).mockResolvedValue(data)
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
}

function alertTimes() {
  return [...screen.getByRole("alert").querySelectorAll("time")].map(time => time.dateTime)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  vi.clearAllMocks()
  client = new BrokerClient()
  connect.mockReturnValue(client)
  vi.mocked(fetchReadings).mockResolvedValue([reading(700), reading(750, T0, "B")])
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("coerência de origem e instante do alerta H06.5", () => {
  it("identifica a origem MQTT e o instante ao ativar o banner crítico", async () => {
    await dashboard()
    publish(1400)
    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("Última leitura recebida do dispositivo A (MQTT)")
    expect(alert.textContent).toContain("1.400 ppm")
    expect(alertTimes()).toEqual([T1])
    expect(screen.getByText("1.400")).toBeDefined()
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it("mantém a desativação exclusivamente por MQTT normal posterior", async () => {
    await dashboard()
    publish(1400)
    await refresh([reading(800, T2)])
    expect(screen.getByRole("alert")).toBeDefined()
    publish(1200, T3)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("1.200")).toBeDefined()
  })

  it("não reativa com MQTT crítico antigo após uma normalização recente", async () => {
    await dashboard()
    publish(900, T2)
    publish(1400, T1)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("900")).toBeDefined()
  })

  it("explica MQTT crítico seguido de Supabase normal mais recente sem desligar o alerta", async () => {
    await dashboard()
    publish(1400)
    await refresh([reading(800, T2)])
    expect(screen.getByText("800")).toBeDefined()
    const alert = screen.getByRole("alert")
    expect(within(alert).getByRole("heading", { name: "Alerta de uma leitura anterior do dispositivo" })).toBeDefined()
    expect(alert.textContent).toContain("Os cards exibem uma leitura mais recente do histórico salvo (Supabase).")
    expect(alert.textContent).toContain("1.400 ppm")
    expect(alertTimes()).toEqual([T1, T2])
    expect(screen.getByText("Histórico (Supabase)")).toBeDefined()
  })

  it("não chama de mais recente um histórico anterior à telemetria MQTT", async () => {
    await dashboard()
    publish(1400, T2)
    await refresh([reading(800, T1)])
    expect(screen.getByText("1.400")).toBeDefined()
    expect(screen.getByRole("alert").textContent).not.toContain("Os cards exibem uma leitura mais recente")
    expect(alertTimes()).toEqual([T2])
  })

  it("não inicializa alerta com Supabase crítico, mesmo sendo a leitura mais recente", async () => {
    vi.mocked(fetchReadings).mockResolvedValue([reading(1800, T2)])
    await dashboard()
    expect(screen.getByText("1.800")).toBeDefined()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("não compara o alerta de A com uma leitura posterior do dispositivo B", async () => {
    await dashboard()
    publish(1400)
    await refresh([reading(800, T3, "B"), reading(700)])
    expect(screen.getByRole("alert").textContent).toContain("dispositivo A")
    expect(screen.getByRole("alert").textContent).not.toContain("Os cards exibem uma leitura mais recente")
    expect(alertTimes()).toEqual([T1])
  })

  it("mantém a referência MQTT e a comparação durante reconexão sem criar outro cliente", async () => {
    await dashboard()
    act(() => client.emit("connect"))
    publish(1400)
    await refresh([reading(800, T2)])
    act(() => { client.emit("offline"); client.emit("connect") })
    expect(alertTimes()).toEqual([T1, T2])
    expect(client.subscribe).toHaveBeenCalledTimes(2)
    expect(connect).toHaveBeenCalledTimes(1)
    publish(900, T0)
    expect(screen.getByRole("alert")).toBeDefined()
    publish(900, T3)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("acompanha a seleção sem misturar valores ou instantes dos dispositivos", async () => {
    const { rerender } = await dashboard()
    publish(1400)
    publish(1500, T2, "B")
    await refresh([reading(800, T3), reading(750, T0, "B")])
    expect(alertTimes()).toEqual([T1, T3])
    rerender(<DashboardTab selectedDevice="B" />)
    expect(screen.getByRole("alert").textContent).toContain("dispositivo B")
    expect(alertTimes()).toEqual([T2])
    rerender(<DashboardTab selectedDevice="A" />)
    expect(alertTimes()).toEqual([T1, T3])
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it("não altera origem, instante ou valor do alerta com duplicatas e entradas inválidas", async () => {
    await dashboard()
    publish(1400)
    publish(1400)
    publish(1900)
    publish(900, T0)
    message({ deviceId: "A", co2: 800, measuredAt: "inválido", temperature: 24, humidity: 50 })
    message({ deviceId: "A", co2: "800", measuredAt: T2, temperature: 24, humidity: 50 })
    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("1.400 ppm")
    expect(alertTimes()).toEqual([T1])
    expect(screen.getByTestId("charts").textContent?.split("A:1400")).toHaveLength(2)
  })

  it("não usa status de conectividade para ativar ou remover o alerta", async () => {
    await dashboard()
    act(() => client.emit("message", "co2nect/A/status", Buffer.from("1")))
    expect(screen.queryByRole("alert")).toBeNull()
    publish(1400)
    act(() => client.emit("message", "co2nect/A/status", Buffer.from("0")))
    expect(screen.getByRole("alert")).toBeDefined()
  })

  it("expõe contexto acessível e não apresenta a medição MQTT como confirmação do ambiente atual", async () => {
    await dashboard()
    publish(1400)
    const alert = screen.getByRole("alert")
    expect(alert.getAttribute("aria-live")).toBe("assertive")
    expect(alert.getAttribute("aria-labelledby")).toBe(within(alert).getByRole("heading").id)
    expect(alert.textContent).toContain("não confirma, por si só, a condição atual do ambiente")
    expect(alert.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    expect(alert.compareDocumentPosition(screen.getByText("Indicadores visíveis"))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("preserva a leitura MQTT em empate com Supabase de outro valor de CO₂", async () => {
    await dashboard()
    publish(1400)
    await refresh([reading(800, T1)])
    expect(screen.getByText("1.400")).toBeDefined()
    // Em empate a seleção atual preserva MQTT: não introduzir uma nova regra de desempate.
    expect(screen.getByRole("alert").textContent).not.toContain("leitura mais recente")
    expect(alertTimes()).toEqual([T1])
  })
})

describe("limites da comparação de apresentação, sem atualizar o alerta", () => {
  const alertStates = { A: { status: "active", revision: Date.parse(T1), co2: 1400 } } as const

  it("não afirma que fontes diferentes representam medições diferentes quando horário e CO₂ coincidem", () => {
    render(<DashboardActiveAlert deviceId="A" alertStates={alertStates}
      currentReading={reading(1400, T1)} currentReadingSource="Supabase" />)
    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("Os cards exibem dados do histórico salvo (Supabase).")
    expect(alert.textContent).not.toContain("outra leitura")
    expect(alert.textContent).not.toContain("mais recente")
    expect(alertTimes()).toEqual([T1, T1])
  })

  it("explica valores diferentes de CO₂ associados ao mesmo horário sem escolher um novo vencedor", () => {
    render(<DashboardActiveAlert deviceId="A" alertStates={alertStates}
      currentReading={reading(800, T1)} currentReadingSource="Supabase" />)
    expect(screen.getByRole("alert").textContent).toContain("As fontes informam valores diferentes de CO₂ para o mesmo horário.")
    expect(screen.getByRole("alert").textContent).toContain("1.400 ppm")
    expect(alertTimes()).toEqual([T1, T1])
  })

  it("trata offsets equivalentes como o mesmo instante", () => {
    render(<DashboardActiveAlert deviceId="A" alertStates={alertStates}
      currentReading={reading(1400, "2026-11-16T09:00:00-03:00")} currentReadingSource="Supabase" />)
    expect(screen.getByRole("alert").textContent).not.toContain("mais recente")
    expect(alertTimes()).toEqual([T1, T1])
  })

  it("exibe diferenças de milissegundos sem arredondá-las para um mesmo horário visível", () => {
    const timestamp = "2026-11-16T12:00:00.100Z"
    render(<DashboardActiveAlert deviceId="A"
      alertStates={{ A: { status: "active", revision: Date.parse(timestamp), co2: 1400 } }}
      currentReading={reading(800, "2026-11-16T12:00:00.200Z")} currentReadingSource="Supabase" />)
    const times = screen.getByRole("alert").querySelectorAll("time")
    expect(times[0].textContent).not.toBe(times[1].textContent)
    expect(screen.getByRole("alert").textContent).toContain("mais recente")
  })

  it("não compara diretamente propriedades de dispositivos diferentes", () => {
    render(<DashboardActiveAlert deviceId="A" alertStates={alertStates}
      currentReading={reading(800, T2, "B")} currentReadingSource="Supabase" />)
    expect(alertTimes()).toEqual([T1])
    expect(screen.getByRole("alert").textContent).not.toContain("Leitura dos cards")
  })

  it("mantém a identificação MQTT quando não há leitura dos cards", () => {
    render(<DashboardActiveAlert deviceId="A" alertStates={alertStates} />)
    expect(alertTimes()).toEqual([T1])
    expect(screen.getByRole("alert").textContent).not.toContain("Leitura dos cards")
  })

  it("não compara um timestamp inválido dos cards nem renderiza Invalid Date", () => {
    render(<DashboardActiveAlert deviceId="A" alertStates={alertStates}
      currentReading={reading(800, "invalid-date")} currentReadingSource="Supabase" />)
    expect(alertTimes()).toEqual([T1])
    expect(screen.getByRole("alert").textContent).not.toContain("Invalid Date")
    expect(screen.getByRole("alert").textContent).not.toContain("Leitura dos cards")
  })

  it("não inventa um horário quando uma propriedade interna isolada contém revisão fora da faixa de Date", () => {
    render(<DashboardActiveAlert deviceId="A"
      alertStates={{ A: { status: "active", revision: Number.MAX_SAFE_INTEGER, co2: 1400 } }} />)
    expect(alertTimes()).toEqual([])
    expect(screen.getByRole("alert").textContent).toContain("Horário da leitura do dispositivo indisponível.")
    expect(screen.getByRole("alert").textContent).not.toContain("Invalid Date")
  })
})

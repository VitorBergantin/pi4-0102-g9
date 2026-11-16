// Revisões e atualizações deste arquivo são fixtures internas, não payloads CT7.
import { describe, expect, it } from "vitest"
import {
  applyInternalAlertUpdate,
  getDeviceAlertState,
  type DeviceAlertStates,
  type InternalAlertUpdate,
} from "@/lib/dashboard/alert-state"

function active(deviceId: string, revision: number, co2 = 600): InternalAlertUpdate {
  return { deviceId, state: { status: "active", revision, co2 } }
}

function inactive(deviceId: string, revision: number): InternalAlertUpdate {
  return { deviceId, state: { status: "inactive", revision } }
}

describe("estado interno do alerta por dispositivo", () => {
  it("considera desconhecidos os dispositivos sem estado", () => {
    expect(getDeviceAlertState({}, "A")).toEqual({ status: "unknown" })
    expect(getDeviceAlertState({}, "constructor")).toEqual({ status: "unknown" })
    expect(getDeviceAlertState({ A: { status: "unknown" } }, "A"))
      .toEqual({ status: "unknown" })
  })

  it("ativa e desativa sem inferir o estado pelo CO₂", () => {
    const initial: DeviceAlertStates = Object.freeze({})
    const enabled = applyInternalAlertUpdate(initial, active("A", 0, 600))
    expect(getDeviceAlertState(enabled, "A")).toEqual({
      status: "active", revision: 0, co2: 600,
    })
    const disabled = applyInternalAlertUpdate(enabled, inactive("A", 1))
    expect(getDeviceAlertState(disabled, "A")).toEqual({ status: "inactive", revision: 1 })
    expect(initial).toEqual({})
    expect(getDeviceAlertState(enabled, "A").status).toBe("active")
  })

  it("preserva estados independentes e ordena por dispositivo", () => {
    const first = applyInternalAlertUpdate({}, active("A", 100))
    const both = applyInternalAlertUpdate(first, inactive("B", 1))
    expect(getDeviceAlertState(both, "A")).toBe(first.A)
    expect(getDeviceAlertState(both, "B")).toEqual({ status: "inactive", revision: 1 })
  })

  it("ignora duplicatas e conteúdo conflitante com a mesma revisão", () => {
    const states = applyInternalAlertUpdate({}, active("A", 2))
    expect(applyInternalAlertUpdate(states, active("A", 2))).toBe(states)
    expect(applyInternalAlertUpdate(states, inactive("A", 2))).toBe(states)
    expect(applyInternalAlertUpdate(states, active("A", 2, 900))).toBe(states)
  })

  it("não apaga um alerta ativo com uma desativação antiga", () => {
    const states = applyInternalAlertUpdate({}, active("A", 3))
    expect(applyInternalAlertUpdate(states, inactive("A", 2))).toBe(states)
  })

  it("mantém a revisão inativa e impede reativação antiga ou duplicada", () => {
    const states = applyInternalAlertUpdate({}, inactive("A", 5))
    expect(applyInternalAlertUpdate(states, active("A", 4))).toBe(states)
    expect(applyInternalAlertUpdate(states, active("A", 5))).toBe(states)
    expect(applyInternalAlertUpdate(states, inactive("A", 5))).toBe(states)
    expect(getDeviceAlertState(applyInternalAlertUpdate(states, active("A", 6)), "A").status)
      .toBe("active")
  })

  it("não mantém referência ao estado mutável recebido", () => {
    const update = { deviceId: "A", state: { status: "active" as const, revision: 1, co2: 600 } }
    const states = applyInternalAlertUpdate({}, update)
    update.state.co2 = 999
    update.state.revision = 10
    expect(getDeviceAlertState(states, "A")).toEqual({ status: "active", revision: 1, co2: 600 })
  })

  it("trata identificadores especiais como chaves próprias", () => {
    const states = applyInternalAlertUpdate({}, active("__proto__", 1))
    expect(getDeviceAlertState(states, "__proto__").status).toBe("active")
    expect(getDeviceAlertState(states, "A").status).toBe("unknown")
    expect(Object.getPrototypeOf(states)).toBe(Object.prototype)
  })

  const invalidUpdates: unknown[] = [
    null, undefined, false, 42, "alerta", [], {},
    { deviceId: "", state: inactive("A", 1).state },
    { deviceId: " ", state: inactive("A", 1).state },
    { deviceId: " A ", state: inactive("A", 1).state },
    { deviceId: 123, state: inactive("A", 1).state },
    { deviceId: "A", state: null },
    { deviceId: "A", state: [] },
    { deviceId: "A", state: { status: "unknown" } },
    { deviceId: "A", state: { status: "invalid", revision: 10 } },
    ...[undefined, "10", NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].map(
      revision => ({ deviceId: "A", state: { status: "inactive", revision } }),
    ),
    ...[undefined, "600", NaN, Infinity, -1, 0].map(
      co2 => ({ deviceId: "A", state: { status: "active", revision: 10, co2 } }),
    ),
  ]

  it.each(invalidUpdates.map((update, index) => ({ update, index })))(
    "ignora entrada inválida $index sem perder os estados conhecidos",
    ({ update }) => {
      const states = applyInternalAlertUpdate(
        applyInternalAlertUpdate({}, inactive("A", 5)), active("B", 2),
      )
      expect(applyInternalAlertUpdate(states, update)).toBe(states)
      expect(getDeviceAlertState(states, "A")).toEqual({ status: "inactive", revision: 5 })
      expect(getDeviceAlertState(states, "B").status).toBe("active")
    },
  )
})

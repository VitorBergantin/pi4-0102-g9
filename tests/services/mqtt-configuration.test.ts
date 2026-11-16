import { EventEmitter } from "node:events"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }))
vi.mock("mqtt", () => ({ default: { connect } }))

class BrokerClient extends EventEmitter {
  disconnecting = false
  subscribe = vi.fn((_topics: string[], callback: (error: Error | null) => void) => callback(null))
  end = vi.fn()
}

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("NEXT_PUBLIC_MQTT_WS_URL", "wss://broker.invalid/mqtt")
  vi.stubEnv("NEXT_PUBLIC_MQTT_USER", "test-user")
  vi.stubEnv("NEXT_PUBLIC_MQTT_PASSWORD", "test-only")
  connect.mockReturnValue(new BrokerClient())
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("configuração complementar MQTT P10", () => {
  it.each([
    "ws://", "wss://", "ws:///mqtt", "ws://?client=test", "not-a-url",
    "http://127.0.0.1:19001", "mqtt://127.0.0.1:1883",
    "ws://127.0.0.1:99999", "wss://broker.invalid/mqtt#fragment", "wss://broker.invalid/mqtt#",
  ])("não tenta conectar com URL inválida: %s", async url => {
    vi.stubEnv("NEXT_PUBLIC_MQTT_WS_URL", url)
    const { initMqttConnection } = await import("@/lib/services/mqtt")
    const onConnectionChange = vi.fn()
    const stop = initMqttConnection(undefined, undefined, onConnectionChange)
    expect(connect).not.toHaveBeenCalled()
    expect(onConnectionChange).toHaveBeenLastCalledWith("disconnected")
    expect(() => stop()).not.toThrow()
  })

  it.each([
    ["production", undefined], ["production", ""], ["production", "   "],
    ["development", undefined], ["development", ""], ["development", "   "],
  ])("não usa fallback fora dos testes: %s / %s", async (environment, url) => {
    vi.stubEnv("NODE_ENV", environment)
    vi.stubEnv("NEXT_PUBLIC_MQTT_WS_URL", url)
    const { initMqttConnection } = await import("@/lib/services/mqtt")
    const change = vi.fn()
    const stop = initMqttConnection(undefined, undefined, change)
    expect(connect).not.toHaveBeenCalled()
    expect(change).toHaveBeenCalledExactlyOnceWith("disconnected")
    expect(() => stop()).not.toThrow()
  })

  it.each([
    "wss://broker.invalid/mqtt", "ws://127.0.0.1:19001",
    "ws://[::1]:19001/mqtt?client=test",
  ])("preserva conexão, assinaturas, telemetria, estados e cleanup: %s", async url => {
    vi.stubEnv("NEXT_PUBLIC_MQTT_WS_URL", url)
    const { initMqttConnection } = await import("@/lib/services/mqtt")
    const onReading = vi.fn()
    const onStatus = vi.fn()
    const change = vi.fn()
    const stop = initMqttConnection(onReading, onStatus, change)
    const client = connect.mock.results[0].value as BrokerClient
    expect(connect).toHaveBeenCalledExactlyOnceWith(url, expect.objectContaining({
      username: "test-user", password: "test-only", clean: true, reconnectPeriod: 3000,
    }))
    expect(change).toHaveBeenLastCalledWith("connecting")
    client.emit("connect")
    expect(client.subscribe).toHaveBeenCalledWith(["co2nect/+/telemetry", "co2nect/+/status"], expect.any(Function))
    expect(change).toHaveBeenLastCalledWith("connected")
    client.emit("message", "co2nect/A/telemetry", Buffer.from(JSON.stringify({
      co2: 1400, temperature: 24, humidity: 50, measuredAt: "2026-11-16T12:00:00Z",
    })))
    client.emit("message", "co2nect/A/status", Buffer.from("1"))
    expect(onReading).toHaveBeenCalledWith(expect.objectContaining({ deviceId: "A", co2: 1400 }))
    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ deviceId: "A", online: true }))
    client.emit("offline")
    expect(change).toHaveBeenLastCalledWith("disconnected")
    client.emit("reconnect")
    expect(change).toHaveBeenLastCalledWith("connecting")
    client.emit("connect")
    expect(client.subscribe).toHaveBeenCalledTimes(2)
    client.emit("close")
    expect(change).toHaveBeenLastCalledWith("disconnected")
    client.emit("error", new Error("Erro simulado"))
    expect(change).toHaveBeenLastCalledWith("disconnected")
    stop()
    expect(client.end).toHaveBeenCalledExactlyOnceWith(true)
  })

  it("mantém credenciais opcionais", async () => {
    vi.stubEnv("NEXT_PUBLIC_MQTT_USER", undefined)
    vi.stubEnv("NEXT_PUBLIC_MQTT_PASSWORD", undefined)
    const { initMqttConnection } = await import("@/lib/services/mqtt")
    initMqttConnection()()
    expect(connect).toHaveBeenCalledWith("wss://broker.invalid/mqtt", expect.objectContaining({ username: undefined, password: undefined }))
  })

  it("mantém o tratamento de exceção síncrona do transporte", async () => {
    connect.mockImplementation(() => { throw new Error("Falha simulada") })
    const { initMqttConnection } = await import("@/lib/services/mqtt")
    const change = vi.fn()
    expect(() => initMqttConnection(undefined, undefined, change)()).not.toThrow()
    expect(change).toHaveBeenLastCalledWith("disconnected")
  })

  it("mantém o callback de falha na assinatura", async () => {
    const client = new BrokerClient()
    client.subscribe.mockImplementation((_topics, callback) => callback(new Error("Assinatura recusada")))
    connect.mockReturnValue(client)
    const { initMqttConnection } = await import("@/lib/services/mqtt")
    const change = vi.fn()
    const stop = initMqttConnection(undefined, undefined, change)
    client.emit("connect")
    expect(change).toHaveBeenLastCalledWith("disconnected")
    stop()
  })

  it("preserva o fallback simbólico exclusivo do ambiente de testes", async () => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("NEXT_PUBLIC_MQTT_WS_URL", undefined)
    const { initMqttConnection } = await import("@/lib/services/mqtt")
    initMqttConnection()()
    expect(connect).toHaveBeenCalledWith("ws://localhost:9001", expect.any(Object))
  })
})

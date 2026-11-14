import { SensorReading } from "@/lib/types/sensor"

const initialTimestamp = Date.now()

// Função auxiliar para subtrair horas da data base atual
function hoursAgo(hours: number): string {
  return new Date(initialTimestamp - hours * 60 * 60 * 1000).toISOString()
}

// Histórico inicial simulado para o primeiro carregamento da aplicação
export const historyMock: SensorReading[] = [
  { id: 1, deviceId: "ESP32-DEV", timestamp: hoursAgo(1), co2: 820, temperature: 24.5, humidity: 55 },
  { id: 2, deviceId: "ESP32-DEV", timestamp: hoursAgo(4), co2: 940, temperature: 25.1, humidity: 58 },
  { id: 3, deviceId: "ESP32-DEV", timestamp: hoursAgo(8), co2: 770, temperature: 24.0, humidity: 51 },
  { id: 4, deviceId: "ESP32-DEV", timestamp: hoursAgo(15), co2: 860, temperature: 24.8, humidity: 56 },
  { id: 5, deviceId: "ESP32-DEV", timestamp: hoursAgo(27), co2: 910, temperature: 25.0, humidity: 57 },
  { id: 6, deviceId: "ESP32-DEV", timestamp: hoursAgo(36), co2: 790, temperature: 23.9, humidity: 52 },
  { id: 7, deviceId: "ESP32-DEV", timestamp: hoursAgo(55), co2: 830, temperature: 24.4, humidity: 54 },
  { id: 8, deviceId: "ESP32-DEV", timestamp: hoursAgo(72), co2: 880, temperature: 24.7, humidity: 56 },
  { id: 9, deviceId: "ESP32-DEV", timestamp: hoursAgo(120), co2: 760, temperature: 23.8, humidity: 50 },
  { id: 10, deviceId: "ESP32-DEV", timestamp: hoursAgo(240), co2: 920, temperature: 25.2, humidity: 59 },
]

// Lista de leituras pré-definidas para simular novas chegadas de dados via botão
export const simulatedReadings: Omit<SensorReading, "id" | "deviceId" | "timestamp">[] = [
  { co2: 790, temperature: 23.8, humidity: 52 },
  { co2: 840, temperature: 24.2, humidity: 54 },
  { co2: 910, temperature: 24.9, humidity: 57 },
  { co2: 960, temperature: 25.4, humidity: 60 },
  { co2: 880, temperature: 24.5, humidity: 56 },
  { co2: 810, temperature: 24.0, humidity: 53 },
]

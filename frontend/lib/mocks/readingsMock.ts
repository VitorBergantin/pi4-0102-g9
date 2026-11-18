import { SensorReading } from "@/lib/types/sensor"

const initialTimestamp = Date.now()

// Função auxiliar para subtrair horas da data base atual
function hoursAgo(hours: number): string {
  return new Date(initialTimestamp - hours * 60 * 60 * 1000).toISOString()
}

// Histórico inicial simulado para o primeiro carregamento da aplicação
export const historyMock: SensorReading[] = [
  { id: 1, deviceId: "ESP32-DEV", timestamp: hoursAgo(0.5), co2: 820, temperature: 24.5, humidity: 55 },
  { id: 2, deviceId: "ESP32-SALA-01", timestamp: hoursAgo(1.5), co2: 1380, temperature: 26.2, humidity: 62 },
  { id: 3, deviceId: "ESP32-DEV", timestamp: hoursAgo(3), co2: 940, temperature: 25.1, humidity: 58 },
  { id: 4, deviceId: "ESP32-LAB-02", timestamp: hoursAgo(5), co2: 680, temperature: 22.8, humidity: 48 },
  { id: 5, deviceId: "ESP32-DEV", timestamp: hoursAgo(8), co2: 770, temperature: 24.0, humidity: 51 },
  { id: 6, deviceId: "ESP32-SALA-01", timestamp: hoursAgo(12), co2: 1450, temperature: 26.8, humidity: 64 },
  { id: 7, deviceId: "ESP32-DEV", timestamp: hoursAgo(18), co2: 860, temperature: 24.8, humidity: 56 },
  { id: 8, deviceId: "ESP32-LAB-02", timestamp: hoursAgo(24), co2: 720, temperature: 23.1, humidity: 49 },
  { id: 9, deviceId: "ESP32-DEV", timestamp: hoursAgo(30), co2: 910, temperature: 25.0, humidity: 57 },
  { id: 10, deviceId: "ESP32-SALA-01", timestamp: hoursAgo(40), co2: 1120, temperature: 25.6, humidity: 60 },
  { id: 11, deviceId: "ESP32-DEV", timestamp: hoursAgo(48), co2: 790, temperature: 23.9, humidity: 52 },
  { id: 12, deviceId: "ESP32-LAB-02", timestamp: hoursAgo(60), co2: 1290, temperature: 25.9, humidity: 61 },
  { id: 13, deviceId: "ESP32-DEV", timestamp: hoursAgo(72), co2: 830, temperature: 24.4, humidity: 54 },
  { id: 14, deviceId: "ESP32-SALA-01", timestamp: hoursAgo(96), co2: 880, temperature: 24.7, humidity: 56 },
  { id: 15, deviceId: "ESP32-DEV", timestamp: hoursAgo(120), co2: 760, temperature: 23.8, humidity: 50 },
  { id: 16, deviceId: "ESP32-LAB-02", timestamp: hoursAgo(160), co2: 920, temperature: 25.2, humidity: 59 },
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

// Mapeamento simulado do status de conectividade de cada sensor ESP32
export const devicesStatusMock: Record<string, boolean> = {
  "ESP32-DEV": true,
  "ESP32-SALA-01": true,
  "ESP32-LAB-02": false, // Simula um sensor desconectado/offline para testes
}

// Auxiliar para verificar se o dispositivo está conectado
export function getDeviceOnlineStatus(deviceId: string): boolean {
  if (deviceId in devicesStatusMock) {
    return devicesStatusMock[deviceId]
  }
  return true
}

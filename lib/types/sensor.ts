// Interface que define a estrutura de uma medição recebida dos sensores
export interface SensorReading {
  id: string | number
  deviceId: string
  timestamp: string // Data e hora da medição em formato ISO string
  co2: number
  temperature: number
  humidity: number
}

// Preferências do usuário para exibição dos cards de indicadores no dashboard
export interface DisplayPreferences {
  co2: boolean
  temperature: boolean
  humidity: boolean
}

// Status de conectividade de um dispositivo IoT
export interface DeviceStatus {
  deviceId: string
  online: boolean
  timestamp: string
}

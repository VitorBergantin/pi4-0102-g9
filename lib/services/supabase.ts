import { createClient } from "@supabase/supabase-js"
import { SensorReading } from "@/lib/types/sensor"

// Carrega as variáveis de ambiente (suporta tanto o padrão do Next.js NEXT_PUBLIC quanto VITE_)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Cliente de conexão ao Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Consulta o banco de dados Supabase e retorna as medições ordenadas pela data decrescente.
 */
export async function fetchReadings(limit = 50): Promise<SensorReading[]> {
  const { data, error } = await supabase
    .from("sensor_reading") // FROM sensor_reading
    .select("id, device_id, co2, temperature, humidity, measured_at") // SELECT ...
    .order("measured_at", { ascending: false }) // ORDER BY measured_at DESC
    .limit(limit) // LIMIT limit

  if (error) {
    console.error("Erro ao consultar Supabase:", error)
    return []
  }

  // Mapeia os dados do schema SQL (snake_case) para a interface TypeScript (camelCase)
  return (data || []).map((item) => ({
    id: item.id,
    deviceId: item.device_id,
    timestamp: item.measured_at,
    co2: Number(item.co2),
    temperature: Number(item.temperature),
    humidity: Number(item.humidity),
  }))
}

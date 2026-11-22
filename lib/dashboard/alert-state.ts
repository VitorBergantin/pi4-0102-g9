/** Modelo interno do dashboard. Não representa o contrato externo CT7. */
export type DashboardAlertState =
  | Readonly<{ status: "unknown" }>
  | Readonly<{ status: "inactive"; revision: number }>
  | Readonly<{ status: "active"; revision: number; co2: number }>

export type DeviceAlertStates = Readonly<
  Partial<Record<string, DashboardAlertState>>
>

/**
 * Testes isolados usam revisões sintéticas. O adaptador de telemetria usa o
 * timestamp da medição; nunca atribuir revisões pela ordem de chegada real.
 * Esta função não classifica CO₂: recebe o estado do adaptador ou dos testes.
 */
export interface InternalAlertUpdate {
  readonly deviceId: string
  readonly state: Exclude<DashboardAlertState, { status: "unknown" }>
}

const UNKNOWN_ALERT: DashboardAlertState = Object.freeze({ status: "unknown" })

export function getDeviceAlertState(
  states: DeviceAlertStates,
  deviceId: string,
): DashboardAlertState {
  return Object.prototype.hasOwnProperty.call(states, deviceId)
    ? states[deviceId] ?? UNKNOWN_ALERT
    : UNKNOWN_ALERT
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isInternalAlertUpdate(value: unknown): value is InternalAlertUpdate {
  if (!isRecord(value)) return false
  if (
    typeof value.deviceId !== "string" ||
    !value.deviceId.trim() ||
    value.deviceId !== value.deviceId.trim() ||
    !isRecord(value.state)
  ) return false

  const { status, revision, co2 } = value.state
  if (
    typeof revision !== "number" ||
    !Number.isSafeInteger(revision) ||
    revision < 0
  ) return false

  return status === "inactive" || (
    status === "active" &&
    typeof co2 === "number" &&
    Number.isFinite(co2) &&
    co2 > 0
  )
}

/** Entradas inválidas, duplicadas ou antigas preservam o mesmo mapa. */
export function applyInternalAlertUpdate(
  states: DeviceAlertStates,
  update: unknown,
): DeviceAlertStates {
  if (!isInternalAlertUpdate(update)) return states

  const previous = getDeviceAlertState(states, update.deviceId)
  if (previous.status !== "unknown" && update.state.revision <= previous.revision) {
    return states
  }

  // Copia o estado recebido para não reter uma referência mutável do chamador.
  const state: DashboardAlertState = update.state.status === "active"
    ? { status: "active", revision: update.state.revision, co2: update.state.co2 }
    : { status: "inactive", revision: update.state.revision }

  return { ...states, [update.deviceId]: state }
}

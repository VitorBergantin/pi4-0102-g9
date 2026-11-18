/** Regra provisória de classificação local, compartilhada pelo dashboard. */
export const CRITICAL_CO2_PPM = 1200

export function isCriticalCo2(co2: number): boolean {
  return co2 > CRITICAL_CO2_PPM
}

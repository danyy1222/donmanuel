/**
 * Escalones de redondeo pensados para los billetes y monedas peruanos:
 * monedas de S/1, S/2 y S/5, y billetes de S/10, S/20, S/50, S/100 y S/200.
 */
const ESCALONES = [1, 2, 5, 10, 20, 50, 100, 200]

/**
 * Sugiere con cuánto puede pagar el cliente: el importe justo y los redondeos
 * hacia arriba que la gente suele entregar.
 *
 * El redondeo se calcula sobre `total + 0.01` cuando el total ya cae justo en
 * un escalón. Si no, un total redondo como S/50 haría que todos los escalones
 * devuelvan el mismo número y quedaría un único botón inútil.
 */
export function sugerirPagos(total: number): number[] {
  if (total <= 0) return []

  const opciones = new Set([redondearCentimos(total)])

  for (const escalon of ESCALONES) {
    const n = Math.ceil(total / escalon) * escalon
    if (n > total) opciones.add(n)
  }

  if (opciones.size < 4) {
    for (const escalon of ESCALONES) {
      opciones.add(Math.ceil((total + 0.01) / escalon) * escalon)
    }
  }

  return [...opciones].sort((a, b) => a - b).slice(0, 4)
}

/** Evita que la coma flotante deje importes como 4.3000000000000005. */
function redondearCentimos(n: number): number {
  return Math.round(n * 100) / 100
}

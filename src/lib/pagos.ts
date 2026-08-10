const ESCALONES = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000]

/**
 * Sugiere con cuánto puede pagar el cliente: el importe justo y los redondeos
 * hacia arriba que la gente suele entregar.
 *
 * El redondeo se calcula sobre `total + 1` cuando el total ya cae justo en un
 * escalón. Si no, un total redondo como $900.000 haría que todos los escalones
 * devuelvan el mismo número y quedaría un único botón inútil.
 */
export function sugerirPagos(total: number): number[] {
  if (total <= 0) return []

  const opciones = new Set([total])

  for (const escalon of ESCALONES) {
    const n = Math.ceil(total / escalon) * escalon
    if (n > total) opciones.add(n)
  }

  if (opciones.size < 4) {
    for (const escalon of ESCALONES) {
      opciones.add(Math.ceil((total + 1) / escalon) * escalon)
    }
  }

  return [...opciones].sort((a, b) => a - b).slice(0, 4)
}

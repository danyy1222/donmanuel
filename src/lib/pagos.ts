import type { MetodoPago } from '../db/db'

/**
 * Las formas de cobro, en el orden en que se usan en una bodega peruana: la
 * mayoría de las ventas son en efectivo o por Yape, y la tarjeta es lo último.
 */
export const METODOS_PAGO: { id: MetodoPago; etiqueta: string; icono: string; color: string }[] = [
  { id: 'efectivo', etiqueta: 'Efectivo', icono: '💵', color: '#16a34a' },
  { id: 'yape', etiqueta: 'Yape', icono: '🟣', color: '#742284' },
  { id: 'plin', etiqueta: 'Plin', icono: '🔵', color: '#00b2b0' },
  { id: 'tarjeta', etiqueta: 'Tarjeta', icono: '💳', color: '#64748b' },
  { id: 'transferencia', etiqueta: 'Transfer.', icono: '🏦', color: '#0369a1' },
]

export function nombreMetodo(m: MetodoPago): string {
  return METODOS_PAGO.find((x) => x.id === m)?.etiqueta ?? m
}

/**
 * Si la plata de esa venta entra al cajón o no.
 *
 * Es la distinción que sostiene el arqueo: lo cobrado por Yape, Plin, tarjeta
 * o transferencia está en una cuenta, no en el cajón, y contarlo como efectivo
 * hace que siempre parezca que falta plata.
 */
export function esEfectivo(m: MetodoPago): boolean {
  return m === 'efectivo'
}

/** Métodos que se cobran mostrando un QR al cliente. */
export function usaQr(m: MetodoPago): boolean {
  return m === 'yape' || m === 'plin'
}

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

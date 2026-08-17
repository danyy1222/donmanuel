import { db, type Caja, type MetodoPago, type Venta } from '../db/db'
import { esEfectivo } from './pagos'

export interface ResumenCaja {
  caja: Caja
  /** Cuántas ventas se cobraron en el turno. */
  ventas: number
  totalVendido: number
  /** Cobrado en efectivo: lo único que de verdad está en el cajón. */
  efectivo: number
  /** Cobrado por Yape, Plin, tarjeta y transferencia, separado por método. */
  digital: { metodo: MetodoPago; monto: number }[]
  totalDigital: number
  ingresos: number
  egresos: number
  /**
   * Lo que tendría que haber en el cajón al contarlo. No incluye lo digital:
   * esa plata está en la cuenta del banco, no en la caja.
   */
  esperado: number
}

export function cajaAbierta(): Promise<Caja | undefined> {
  return db.caja.where('estado').equals('abierta').first()
}

/**
 * Abre un turno. Cierra antes cualquiera que hubiera quedado abierto: si la
 * app se cerró sin cerrar caja, dos turnos abiertos a la vez repartirían las
 * ventas del día entre los dos y ninguno cuadraría.
 */
export async function abrirCaja(montoInicial: number, usuarioNombre: string): Promise<number> {
  return db.transaction('rw', db.caja, async () => {
    const previa = await db.caja.where('estado').equals('abierta').first()
    if (previa) await db.caja.update(previa.id!, { estado: 'cerrada', cerrada: new Date() })

    return db.caja.add({
      abierta: new Date(),
      montoInicial,
      abiertaPor: usuarioNombre,
      estado: 'abierta',
    })
  })
}

export async function cerrarCaja(
  cajaId: number,
  contado: number,
  usuarioNombre: string,
): Promise<number> {
  const datos = await resumenCaja(cajaId)
  const diferencia = redondear(contado - (datos?.esperado ?? 0))
  await db.caja.update(cajaId, {
    cerrada: new Date(),
    contado,
    diferencia,
    cerradaPor: usuarioNombre,
    estado: 'cerrada',
  })
  return diferencia
}

export async function anotarMovimiento(
  cajaId: number,
  tipo: 'ingreso' | 'egreso',
  monto: number,
  motivo: string,
  usuarioNombre: string,
): Promise<void> {
  await db.movCaja.add({ cajaId, fecha: new Date(), tipo, monto, motivo, usuarioNombre })
}

export async function resumenCaja(cajaId: number): Promise<ResumenCaja | null> {
  const caja = await db.caja.get(cajaId)
  if (!caja) return null

  const ventas = (await db.ventas.where('cajaId').equals(cajaId).toArray()).filter(
    (v) => v.estado === 'completada',
  )
  const movimientos = await db.movCaja.where('cajaId').equals(cajaId).toArray()

  const efectivo = sumar(ventas.filter((v) => esEfectivo(v.metodoPago)))
  const ingresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)

  const porMetodo = new Map<MetodoPago, number>()
  for (const v of ventas) {
    if (esEfectivo(v.metodoPago)) continue
    porMetodo.set(v.metodoPago, redondear((porMetodo.get(v.metodoPago) ?? 0) + v.total))
  }

  return {
    caja,
    ventas: ventas.length,
    totalVendido: sumar(ventas),
    efectivo,
    digital: [...porMetodo].map(([metodo, monto]) => ({ metodo, monto })),
    totalDigital: redondear([...porMetodo.values()].reduce((s, n) => s + n, 0)),
    ingresos: redondear(ingresos),
    egresos: redondear(egresos),
    esperado: redondear(caja.montoInicial + efectivo + ingresos - egresos),
  }
}

function sumar(ventas: Venta[]): number {
  return redondear(ventas.reduce((s, v) => s + v.total, 0))
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

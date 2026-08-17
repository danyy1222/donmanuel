import { db, type Producto, type TipoMovStock } from '../db/db'

interface Detalle {
  motivo?: string
  usuarioNombre?: string
  ventaId?: number
}

/**
 * Aplica un movimiento de stock y lo deja anotado en el historial, siempre
 * juntos: un stock que cambia sin quedar registrado es exactamente lo que
 * después nadie puede explicar cuando el inventario no cuadra.
 *
 * `cantidad` va firmada: positiva si entra mercadería, negativa si sale.
 * Devuelve el stock que quedó.
 *
 * Relee el producto adentro de la transacción en vez de confiar en la copia
 * que le pasaron: entre que se dibujó la pantalla y se tocó el botón puede
 * haberse vendido algo.
 */
export function moverStock(
  productoId: number,
  tipo: TipoMovStock,
  cantidad: number,
  detalle: Detalle = {},
): Promise<number> {
  return db.transaction('rw', db.productos, db.movStock, async () => {
    const producto = await db.productos.get(productoId)
    if (!producto) return 0

    const restante = redondear(producto.stock + cantidad)
    await db.productos.update(productoId, { stock: restante })
    await db.movStock.add({
      productoId,
      nombre: producto.nombre,
      fecha: new Date(),
      tipo,
      cantidad: redondear(cantidad),
      restante,
      costoUnit: producto.precioCosto,
      ...detalle,
    })
    return restante
  })
}

/**
 * Deja el stock en un número exacto, anotando la diferencia contra lo que
 * había. Es lo que se usa al contar el inventario de verdad.
 */
export function ajustarStock(productoId: number, contado: number, detalle: Detalle = {}) {
  return db.transaction('rw', db.productos, db.movStock, async () => {
    const producto = await db.productos.get(productoId)
    if (!producto) return 0
    return moverStock(productoId, 'ajuste', contado - producto.stock, detalle)
  })
}

/** Productos que llegaron al mínimo configurado. Los que no lo usan no cuentan. */
export function estaBajo(p: Producto): boolean {
  return p.stockMinimo > 0 && p.stock <= p.stockMinimo
}

/**
 * Los kilos se manejan con tres decimales, como la balanza. Sin redondear, la
 * coma flotante deja stocks como 2.9999999999999996 después de unas ventas.
 */
function redondear(n: number): number {
  return Math.round(n * 1000) / 1000
}

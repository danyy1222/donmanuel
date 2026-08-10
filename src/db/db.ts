import Dexie, { type Table } from 'dexie'

/** Cómo se vende un producto. Define qué se le pide al vendedor al cargarlo. */
export type TipoVenta = 'unidad' | 'peso' | 'atado'

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia'

export interface Categoria {
  id?: number
  nombre: string
  color: string
  orden: number
}

export interface Producto {
  id?: number
  codigoBarras?: string
  nombre: string
  categoriaId: number
  tipoVenta: TipoVenta
  /** Para tipoVenta 'peso' este es el precio por kilo. */
  precioVenta: number
  precioCosto: number
  stock: number
  stockMinimo: number
  /** Se muestra en la botonera cuando el producto no tiene foto cargada. */
  emoji?: string
  /**
   * Las fotos viven en su propia tabla. Si estuvieran acá, listar productos
   * traería todas las imágenes a memoria solo para dibujar miniaturas.
   */
  tieneFoto?: number
  activo: number
}

export interface Foto {
  productoId: number
  blob: Blob
}

export interface Pdf {
  boletaId: number
  blob: Blob
}

export interface VentaItem {
  productoId?: number
  nombre: string
  tipoVenta: TipoVenta
  /** Unidades vendidas. Para productos por peso guarda los kilos. */
  cantidad: number
  precioUnit: number
  subtotal: number
}

export type Rol = 'dueño' | 'cajero'

export interface Usuario {
  id?: number
  nombre: string
  /** SHA-256 del PIN con sal. Nunca se guarda el PIN en claro. */
  pinHash: string
  sal: string
  rol: Rol
  activo: number
  creado: Date
}

export interface Venta {
  id?: number
  fecha: Date
  usuarioId?: number
  /**
   * El nombre se copia además del id: si mañana se da de baja al cajero, las
   * ventas viejas tienen que seguir diciendo quién las hizo.
   */
  usuarioNombre?: string
  items: VentaItem[]
  subtotal: number
  descuento: number
  total: number
  metodoPago: MetodoPago
  /** Solo se guarda en pagos en efectivo, para poder reconstruir el arqueo. */
  pagoCon?: number
  vuelto?: number
  estado: 'completada' | 'anulada'
}

export interface BoletaItem {
  nombre: string
  cantidad: number
  tipoVenta: TipoVenta
  precioUnit: number
  subtotal: number
}

export interface Boleta {
  id?: number
  numero: string
  ventaId?: number
  fecha: Date
  clienteNombre: string
  clienteTelefono: string
  clienteDoc?: string
  clienteDireccion?: string
  /**
   * Copia congelada de los ítems. No se referencia al producto a propósito:
   * si mañana cambia el precio, la boleta vieja tiene que seguir mostrando
   * lo que se cobró ese día.
   */
  items: BoletaItem[]
  subtotal: number
  descuento: number
  total: number
  metodoPago: MetodoPago
  formato: 'ticket' | 'a4'
  /** El PDF vive en la tabla `pdfs`, por lo mismo que las fotos. */
  tienePdf?: number
  enviada: number
  enviadaA?: string
  fechaEnvio?: Date
}

export interface Config {
  clave: string
  valor: string
}

export class TiendaDB extends Dexie {
  categorias!: Table<Categoria, number>
  productos!: Table<Producto, number>
  ventas!: Table<Venta, number>
  boletas!: Table<Boleta, number>
  usuarios!: Table<Usuario, number>
  fotos!: Table<Foto, number>
  pdfs!: Table<Pdf, number>
  config!: Table<Config, string>

  constructor() {
    super('sistema-tienda')
    this.version(1).stores({
      categorias: '++id, orden',
      // 'activo' es número y no booleano porque IndexedDB no indexa booleanos.
      productos: '++id, codigoBarras, nombre, categoriaId, activo',
      ventas: '++id, fecha, estado',
      boletas: '++id, numero, fecha, ventaId, enviada',
      config: 'clave',
    })

    // Los usuarios llegaron después: Dexie migra solo las bases ya instaladas
    // sin tocar los datos que tengan cargados.
    this.version(2).stores({
      usuarios: '++id, nombre, rol, activo',
      ventas: '++id, fecha, estado, usuarioId',
    })

    // Las imágenes y los PDF se mudan a tablas aparte. Antes viajaban dentro
    // de cada producto y cada boleta, así que listarlos levantaba todos los
    // binarios a memoria aunque solo se mostrara el nombre y el precio.
    this.version(3)
      .stores({
        fotos: 'productoId',
        pdfs: 'boletaId',
      })
      .upgrade(async (tx) => {
        const productos = tx.table<Producto & { foto?: Blob }>('productos')
        for (const p of await productos.toArray()) {
          if (!p.foto) continue
          await tx.table('fotos').put({ productoId: p.id!, blob: p.foto })
          delete p.foto
          await productos.put({ ...p, tieneFoto: 1 })
        }

        const boletas = tx.table<Boleta & { pdf?: Blob }>('boletas')
        for (const b of await boletas.toArray()) {
          if (!b.pdf) continue
          await tx.table('pdfs').put({ boletaId: b.id!, blob: b.pdf })
          delete b.pdf
          await boletas.put({ ...b, tienePdf: 1 })
        }
      })
  }
}

export async function guardarFoto(productoId: number, blob: Blob): Promise<void> {
  await db.transaction('rw', db.fotos, db.productos, async () => {
    await db.fotos.put({ productoId, blob })
    await db.productos.update(productoId, { tieneFoto: 1 })
  })
}

export async function leerFoto(productoId: number): Promise<Blob | undefined> {
  return (await db.fotos.get(productoId))?.blob
}

export async function guardarPdf(boletaId: number, blob: Blob): Promise<void> {
  await db.transaction('rw', db.pdfs, db.boletas, async () => {
    await db.pdfs.put({ boletaId, blob })
    await db.boletas.update(boletaId, { tienePdf: 1 })
  })
}

export async function leerPdf(boletaId: number): Promise<Blob | undefined> {
  return (await db.pdfs.get(boletaId))?.blob
}

export const db = new TiendaDB()

export async function leerConfig(clave: string, porDefecto = ''): Promise<string> {
  const fila = await db.config.get(clave)
  return fila?.valor ?? porDefecto
}

export async function guardarConfig(clave: string, valor: string): Promise<void> {
  await db.config.put({ clave, valor })
}

/**
 * Devuelve el próximo número de boleta y lo reserva en la misma transacción,
 * para que dos boletas creadas casi al mismo tiempo no compartan número.
 */
export async function proximoNumeroBoleta(): Promise<string> {
  return db.transaction('rw', db.config, async () => {
    const actual = Number((await db.config.get('ultimaBoleta'))?.valor ?? '0')
    const siguiente = actual + 1
    await db.config.put({ clave: 'ultimaBoleta', valor: String(siguiente) })
    return `BOL-${String(siguiente).padStart(4, '0')}`
  })
}

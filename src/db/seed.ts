import { db, type Categoria, type Producto } from './db'

const CATEGORIAS: Categoria[] = [
  { nombre: 'Verduras', color: '#16a34a', orden: 1 },
  { nombre: 'Frutas', color: '#ea580c', orden: 2 },
  { nombre: 'Abarrotes', color: '#2563eb', orden: 3 },
  { nombre: 'Bebidas', color: '#0891b2', orden: 4 },
  { nombre: 'Limpieza', color: '#7c3aed', orden: 5 },
]

type ProductoSemilla = Omit<Producto, 'id' | 'categoriaId'> & { categoria: string }

/**
 * Productos de ejemplo con nombres y precios de mercado peruano, para poder
 * probar el sistema sin cargar nada. Se reemplazan por los de la tienda desde
 * la pantalla de Productos.
 */
const PRODUCTOS: ProductoSemilla[] = [
  // Verduras: casi todas por peso, sin código de barras, se buscan mirando.
  { categoria: 'Verduras', nombre: 'Tomate', tipoVenta: 'peso', precioVenta: 4.5, precioCosto: 3, stock: 25, stockMinimo: 5, emoji: '🍅', activo: 1 },
  { categoria: 'Verduras', nombre: 'Papa blanca', tipoVenta: 'peso', precioVenta: 3, precioCosto: 2, stock: 60, stockMinimo: 15, emoji: '🥔', activo: 1 },
  { categoria: 'Verduras', nombre: 'Papa amarilla', tipoVenta: 'peso', precioVenta: 5, precioCosto: 3.5, stock: 30, stockMinimo: 8, emoji: '🥔', activo: 1 },
  { categoria: 'Verduras', nombre: 'Cebolla roja', tipoVenta: 'peso', precioVenta: 3.5, precioCosto: 2.2, stock: 40, stockMinimo: 10, emoji: '🧅', activo: 1 },
  { categoria: 'Verduras', nombre: 'Zanahoria', tipoVenta: 'peso', precioVenta: 3, precioCosto: 1.8, stock: 30, stockMinimo: 8, emoji: '🥕', activo: 1 },
  { categoria: 'Verduras', nombre: 'Lechuga', tipoVenta: 'unidad', precioVenta: 2.5, precioCosto: 1.5, stock: 20, stockMinimo: 5, emoji: '🥬', activo: 1 },
  { categoria: 'Verduras', nombre: 'Zapallo macre', tipoVenta: 'peso', precioVenta: 4, precioCosto: 2.5, stock: 18, stockMinimo: 4, emoji: '🎃', activo: 1 },
  { categoria: 'Verduras', nombre: 'Ají amarillo', tipoVenta: 'peso', precioVenta: 8, precioCosto: 5, stock: 8, stockMinimo: 2, emoji: '🌶️', activo: 1 },
  { categoria: 'Verduras', nombre: 'Rocoto', tipoVenta: 'peso', precioVenta: 8, precioCosto: 5, stock: 6, stockMinimo: 2, emoji: '🌶️', activo: 1 },
  { categoria: 'Verduras', nombre: 'Pimiento', tipoVenta: 'peso', precioVenta: 6, precioCosto: 4, stock: 12, stockMinimo: 3, emoji: '🫑', activo: 1 },
  { categoria: 'Verduras', nombre: 'Choclo', tipoVenta: 'unidad', precioVenta: 2.5, precioCosto: 1.5, stock: 24, stockMinimo: 6, emoji: '🌽', activo: 1 },
  { categoria: 'Verduras', nombre: 'Culantro', tipoVenta: 'atado', precioVenta: 1, precioCosto: 0.5, stock: 20, stockMinimo: 5, emoji: '🌿', activo: 1 },
  { categoria: 'Verduras', nombre: 'Acelga', tipoVenta: 'atado', precioVenta: 2, precioCosto: 1.2, stock: 15, stockMinimo: 4, emoji: '🌿', activo: 1 },
  { categoria: 'Verduras', nombre: 'Ajo', tipoVenta: 'peso', precioVenta: 12, precioCosto: 8, stock: 10, stockMinimo: 3, emoji: '🧄', activo: 1 },
  { categoria: 'Verduras', nombre: 'Camote', tipoVenta: 'peso', precioVenta: 2.5, precioCosto: 1.5, stock: 25, stockMinimo: 6, emoji: '🍠', activo: 1 },
  { categoria: 'Verduras', nombre: 'Yuca', tipoVenta: 'peso', precioVenta: 3, precioCosto: 1.8, stock: 22, stockMinimo: 6, emoji: '🥔', activo: 1 },
  { categoria: 'Verduras', nombre: 'Pepino', tipoVenta: 'peso', precioVenta: 3.5, precioCosto: 2, stock: 8, stockMinimo: 3, emoji: '🥒', activo: 1 },
  { categoria: 'Verduras', nombre: 'Brócoli', tipoVenta: 'unidad', precioVenta: 4, precioCosto: 2.5, stock: 9, stockMinimo: 3, emoji: '🥦', activo: 1 },
  { categoria: 'Verduras', nombre: 'Vainita', tipoVenta: 'peso', precioVenta: 5, precioCosto: 3.2, stock: 10, stockMinimo: 3, emoji: '🫛', activo: 1 },

  { categoria: 'Frutas', nombre: 'Plátano de seda', tipoVenta: 'peso', precioVenta: 3, precioCosto: 1.8, stock: 35, stockMinimo: 8, emoji: '🍌', activo: 1 },
  { categoria: 'Frutas', nombre: 'Palta fuerte', tipoVenta: 'peso', precioVenta: 7, precioCosto: 4.5, stock: 20, stockMinimo: 5, emoji: '🥑', activo: 1 },
  { categoria: 'Frutas', nombre: 'Manzana israel', tipoVenta: 'peso', precioVenta: 5, precioCosto: 3.2, stock: 28, stockMinimo: 8, emoji: '🍎', activo: 1 },
  { categoria: 'Frutas', nombre: 'Naranja de jugo', tipoVenta: 'peso', precioVenta: 3, precioCosto: 1.8, stock: 45, stockMinimo: 10, emoji: '🍊', activo: 1 },
  { categoria: 'Frutas', nombre: 'Mandarina', tipoVenta: 'peso', precioVenta: 4, precioCosto: 2.5, stock: 30, stockMinimo: 8, emoji: '🍊', activo: 1 },
  { categoria: 'Frutas', nombre: 'Limón', tipoVenta: 'peso', precioVenta: 4, precioCosto: 2.5, stock: 22, stockMinimo: 5, emoji: '🍋', activo: 1 },
  { categoria: 'Frutas', nombre: 'Papaya', tipoVenta: 'peso', precioVenta: 4.5, precioCosto: 3, stock: 15, stockMinimo: 4, emoji: '🍈', activo: 1 },
  { categoria: 'Frutas', nombre: 'Piña', tipoVenta: 'unidad', precioVenta: 5, precioCosto: 3, stock: 12, stockMinimo: 4, emoji: '🍍', activo: 1 },
  { categoria: 'Frutas', nombre: 'Fresa', tipoVenta: 'peso', precioVenta: 8, precioCosto: 5.5, stock: 12, stockMinimo: 4, emoji: '🍓', activo: 1 },
  { categoria: 'Frutas', nombre: 'Uva red globe', tipoVenta: 'peso', precioVenta: 8, precioCosto: 5.5, stock: 14, stockMinimo: 4, emoji: '🍇', activo: 1 },
  { categoria: 'Frutas', nombre: 'Sandía', tipoVenta: 'peso', precioVenta: 2.5, precioCosto: 1.5, stock: 50, stockMinimo: 10, emoji: '🍉', activo: 1 },
  { categoria: 'Frutas', nombre: 'Mango', tipoVenta: 'peso', precioVenta: 4.5, precioCosto: 3, stock: 20, stockMinimo: 5, emoji: '🥭', activo: 1 },

  // Abarrotes: estos sí traen código de barras, se escanean.
  { categoria: 'Abarrotes', nombre: 'Arroz Costeño 5kg', codigoBarras: '7750243021508', tipoVenta: 'unidad', precioVenta: 25, precioCosto: 21, stock: 24, stockMinimo: 6, emoji: '🍚', activo: 1 },
  { categoria: 'Abarrotes', nombre: 'Aceite Primor 1L', codigoBarras: '7750151000018', tipoVenta: 'unidad', precioVenta: 10.5, precioCosto: 8.5, stock: 30, stockMinimo: 8, emoji: '🫗', activo: 1 },
  { categoria: 'Abarrotes', nombre: 'Azúcar rubia 1kg', tipoVenta: 'peso', precioVenta: 4.5, precioCosto: 3.4, stock: 40, stockMinimo: 10, emoji: '🧂', activo: 1 },
  { categoria: 'Abarrotes', nombre: 'Fideos Don Vittorio 500g', codigoBarras: '7750885000159', tipoVenta: 'unidad', precioVenta: 3.5, precioCosto: 2.6, stock: 40, stockMinimo: 10, emoji: '🍝', activo: 1 },
  { categoria: 'Abarrotes', nombre: 'Leche Gloria tarro', codigoBarras: '7751271000106', tipoVenta: 'unidad', precioVenta: 4.5, precioCosto: 3.6, stock: 48, stockMinimo: 12, emoji: '🥛', activo: 1 },
  { categoria: 'Abarrotes', nombre: 'Huevos', tipoVenta: 'peso', precioVenta: 8.5, precioCosto: 6.5, stock: 20, stockMinimo: 5, emoji: '🥚', activo: 1 },
  { categoria: 'Abarrotes', nombre: 'Atún Florida', codigoBarras: '7750182001309', tipoVenta: 'unidad', precioVenta: 5.5, precioCosto: 4.2, stock: 30, stockMinimo: 8, emoji: '🐟', activo: 1 },
  { categoria: 'Abarrotes', nombre: 'Pan francés', tipoVenta: 'unidad', precioVenta: 0.4, precioCosto: 0.25, stock: 100, stockMinimo: 20, emoji: '🥖', activo: 1 },

  { categoria: 'Bebidas', nombre: 'Inca Kola 1.5L', codigoBarras: '7751271001509', tipoVenta: 'unidad', precioVenta: 7, precioCosto: 5.5, stock: 36, stockMinimo: 12, emoji: '🥤', activo: 1 },
  { categoria: 'Bebidas', nombre: 'Coca Cola 1.5L', codigoBarras: '7751271001516', tipoVenta: 'unidad', precioVenta: 7, precioCosto: 5.5, stock: 36, stockMinimo: 12, emoji: '🥤', activo: 1 },
  { categoria: 'Bebidas', nombre: 'Agua San Luis 2.5L', codigoBarras: '7751271002018', tipoVenta: 'unidad', precioVenta: 4, precioCosto: 2.9, stock: 48, stockMinimo: 12, emoji: '💧', activo: 1 },
  { categoria: 'Bebidas', nombre: 'Cerveza Pilsen lata', codigoBarras: '7750255000102', tipoVenta: 'unidad', precioVenta: 4.5, precioCosto: 3.5, stock: 60, stockMinimo: 24, emoji: '🍺', activo: 1 },

  { categoria: 'Limpieza', nombre: 'Lejía Clorox 1L', codigoBarras: '7751158000105', tipoVenta: 'unidad', precioVenta: 3.5, precioCosto: 2.5, stock: 20, stockMinimo: 5, emoji: '🧴', activo: 1 },
  { categoria: 'Limpieza', nombre: 'Detergente Bolívar 780g', codigoBarras: '7751158000204', tipoVenta: 'unidad', precioVenta: 8, precioCosto: 6.2, stock: 18, stockMinimo: 5, emoji: '🧽', activo: 1 },
  { categoria: 'Limpieza', nombre: 'Papel higiénico Elite x4', codigoBarras: '7751158000303', tipoVenta: 'unidad', precioVenta: 6, precioCosto: 4.5, stock: 22, stockMinimo: 6, emoji: '🧻', activo: 1 },
  { categoria: 'Limpieza', nombre: 'Jabón Bolívar', codigoBarras: '7751158000402', tipoVenta: 'unidad', precioVenta: 2.5, precioCosto: 1.8, stock: 30, stockMinimo: 8, emoji: '🧼', activo: 1 },
]

/** Carga categorías y productos de ejemplo la primera vez que se abre la app. */
export async function sembrarSiHaceFalta(): Promise<void> {
  if ((await db.categorias.count()) > 0) return

  await db.transaction('rw', db.categorias, db.productos, db.config, async () => {
    const ids = await db.categorias.bulkAdd(CATEGORIAS, { allKeys: true })
    const porNombre = new Map(CATEGORIAS.map((c, i) => [c.nombre, ids[i]]))

    await db.productos.bulkAdd(
      PRODUCTOS.map(({ categoria, ...resto }) => ({
        ...resto,
        categoriaId: porNombre.get(categoria)!,
      })),
    )

    await db.config.bulkPut([
      { clave: 'tiendaNombre', valor: 'Tienda Don Manuel' },
      { clave: 'tiendaDireccion', valor: '' },
      { clave: 'tiendaTelefono', valor: '' },
      { clave: 'ultimaBoleta', valor: '0' },
    ])
  })
}

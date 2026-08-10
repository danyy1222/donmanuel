import { db, type Categoria, type Producto } from './db'

const CATEGORIAS: Categoria[] = [
  { nombre: 'Verduras', color: '#16a34a', orden: 1 },
  { nombre: 'Frutas', color: '#ea580c', orden: 2 },
  { nombre: 'Almacén', color: '#2563eb', orden: 3 },
  { nombre: 'Bebidas', color: '#0891b2', orden: 4 },
  { nombre: 'Limpieza', color: '#7c3aed', orden: 5 },
]

type ProductoSemilla = Omit<Producto, 'id' | 'categoriaId'> & { categoria: string }

const PRODUCTOS: ProductoSemilla[] = [
  // Verduras: casi todas por peso, sin código de barras, se buscan mirando.
  { categoria: 'Verduras', nombre: 'Tomate', tipoVenta: 'peso', precioVenta: 1800, precioCosto: 1100, stock: 25, stockMinimo: 5, emoji: '🍅', activo: 1 },
  { categoria: 'Verduras', nombre: 'Papa', tipoVenta: 'peso', precioVenta: 900, precioCosto: 550, stock: 60, stockMinimo: 15, emoji: '🥔', activo: 1 },
  { categoria: 'Verduras', nombre: 'Cebolla', tipoVenta: 'peso', precioVenta: 1100, precioCosto: 700, stock: 40, stockMinimo: 10, emoji: '🧅', activo: 1 },
  { categoria: 'Verduras', nombre: 'Zanahoria', tipoVenta: 'peso', precioVenta: 1200, precioCosto: 750, stock: 30, stockMinimo: 8, emoji: '🥕', activo: 1 },
  { categoria: 'Verduras', nombre: 'Lechuga', tipoVenta: 'unidad', precioVenta: 1500, precioCosto: 900, stock: 20, stockMinimo: 5, emoji: '🥬', activo: 1 },
  { categoria: 'Verduras', nombre: 'Zapallo', tipoVenta: 'peso', precioVenta: 1000, precioCosto: 600, stock: 18, stockMinimo: 4, emoji: '🎃', activo: 1 },
  { categoria: 'Verduras', nombre: 'Morrón', tipoVenta: 'peso', precioVenta: 2800, precioCosto: 1900, stock: 12, stockMinimo: 3, emoji: '🫑', activo: 1 },
  { categoria: 'Verduras', nombre: 'Choclo', tipoVenta: 'unidad', precioVenta: 800, precioCosto: 500, stock: 24, stockMinimo: 6, emoji: '🌽', activo: 1 },
  { categoria: 'Verduras', nombre: 'Acelga', tipoVenta: 'atado', precioVenta: 1300, precioCosto: 800, stock: 15, stockMinimo: 4, emoji: '🌿', activo: 1 },
  { categoria: 'Verduras', nombre: 'Ajo', tipoVenta: 'unidad', precioVenta: 600, precioCosto: 350, stock: 30, stockMinimo: 8, emoji: '🧄', activo: 1 },
  { categoria: 'Verduras', nombre: 'Berenjena', tipoVenta: 'peso', precioVenta: 2200, precioCosto: 1400, stock: 10, stockMinimo: 3, emoji: '🍆', activo: 1 },
  { categoria: 'Verduras', nombre: 'Pepino', tipoVenta: 'peso', precioVenta: 1900, precioCosto: 1200, stock: 8, stockMinimo: 3, emoji: '🥒', activo: 1 },
  { categoria: 'Verduras', nombre: 'Brócoli', tipoVenta: 'unidad', precioVenta: 2000, precioCosto: 1300, stock: 9, stockMinimo: 3, emoji: '🥦', activo: 1 },

  { categoria: 'Frutas', nombre: 'Banana', tipoVenta: 'peso', precioVenta: 1600, precioCosto: 1000, stock: 35, stockMinimo: 8, emoji: '🍌', activo: 1 },
  { categoria: 'Frutas', nombre: 'Manzana', tipoVenta: 'peso', precioVenta: 2100, precioCosto: 1400, stock: 28, stockMinimo: 8, emoji: '🍎', activo: 1 },
  { categoria: 'Frutas', nombre: 'Naranja', tipoVenta: 'peso', precioVenta: 1400, precioCosto: 850, stock: 45, stockMinimo: 10, emoji: '🍊', activo: 1 },
  { categoria: 'Frutas', nombre: 'Pera', tipoVenta: 'peso', precioVenta: 2000, precioCosto: 1300, stock: 20, stockMinimo: 5, emoji: '🍐', activo: 1 },
  { categoria: 'Frutas', nombre: 'Limón', tipoVenta: 'peso', precioVenta: 1700, precioCosto: 1000, stock: 22, stockMinimo: 5, emoji: '🍋', activo: 1 },
  { categoria: 'Frutas', nombre: 'Frutilla', tipoVenta: 'unidad', precioVenta: 3500, precioCosto: 2400, stock: 12, stockMinimo: 4, emoji: '🍓', activo: 1 },
  { categoria: 'Frutas', nombre: 'Uva', tipoVenta: 'peso', precioVenta: 3200, precioCosto: 2200, stock: 14, stockMinimo: 4, emoji: '🍇', activo: 1 },
  { categoria: 'Frutas', nombre: 'Sandía', tipoVenta: 'peso', precioVenta: 800, precioCosto: 450, stock: 50, stockMinimo: 10, emoji: '🍉', activo: 1 },

  // Almacén: estos sí traen código de barras, se escanean.
  { categoria: 'Almacén', nombre: 'Aceite girasol 900ml', codigoBarras: '7790070410016', tipoVenta: 'unidad', precioVenta: 2900, precioCosto: 2100, stock: 24, stockMinimo: 6, emoji: '🫗', activo: 1 },
  { categoria: 'Almacén', nombre: 'Arroz largo fino 1kg', codigoBarras: '7790070310019', tipoVenta: 'unidad', precioVenta: 1800, precioCosto: 1250, stock: 30, stockMinimo: 8, emoji: '🍚', activo: 1 },
  { categoria: 'Almacén', nombre: 'Fideos guiseros 500g', codigoBarras: '7790070210012', tipoVenta: 'unidad', precioVenta: 1200, precioCosto: 800, stock: 40, stockMinimo: 10, emoji: '🍝', activo: 1 },
  { categoria: 'Almacén', nombre: 'Azúcar 1kg', codigoBarras: '7790070110015', tipoVenta: 'unidad', precioVenta: 1600, precioCosto: 1100, stock: 25, stockMinimo: 6, emoji: '🧂', activo: 1 },
  { categoria: 'Almacén', nombre: 'Huevos docena', tipoVenta: 'unidad', precioVenta: 3400, precioCosto: 2600, stock: 18, stockMinimo: 5, emoji: '🥚', activo: 1 },
  { categoria: 'Almacén', nombre: 'Pan lactal', codigoBarras: '7790070510013', tipoVenta: 'unidad', precioVenta: 2200, precioCosto: 1500, stock: 12, stockMinimo: 4, emoji: '🍞', activo: 1 },

  { categoria: 'Bebidas', nombre: 'Gaseosa 2.25L', codigoBarras: '7790895000133', tipoVenta: 'unidad', precioVenta: 3200, precioCosto: 2300, stock: 36, stockMinimo: 12, emoji: '🥤', activo: 1 },
  { categoria: 'Bebidas', nombre: 'Agua mineral 1.5L', codigoBarras: '7790895000140', tipoVenta: 'unidad', precioVenta: 1500, precioCosto: 950, stock: 48, stockMinimo: 12, emoji: '💧', activo: 1 },
  { categoria: 'Bebidas', nombre: 'Cerveza lata', codigoBarras: '7790895000157', tipoVenta: 'unidad', precioVenta: 1900, precioCosto: 1300, stock: 60, stockMinimo: 24, emoji: '🍺', activo: 1 },

  { categoria: 'Limpieza', nombre: 'Lavandina 1L', codigoBarras: '7790250110018', tipoVenta: 'unidad', precioVenta: 1400, precioCosto: 900, stock: 20, stockMinimo: 5, emoji: '🧴', activo: 1 },
  { categoria: 'Limpieza', nombre: 'Detergente 750ml', codigoBarras: '7790250210015', tipoVenta: 'unidad', precioVenta: 2100, precioCosto: 1450, stock: 18, stockMinimo: 5, emoji: '🧽', activo: 1 },
  { categoria: 'Limpieza', nombre: 'Papel higiénico x4', codigoBarras: '7790250310012', tipoVenta: 'unidad', precioVenta: 2800, precioCosto: 2000, stock: 22, stockMinimo: 6, emoji: '🧻', activo: 1 },
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
      { clave: 'tiendaNombre', valor: 'Mi Tienda' },
      { clave: 'tiendaDireccion', valor: '' },
      { clave: 'tiendaTelefono', valor: '' },
      { clave: 'ultimaBoleta', valor: '0' },
    ])
  })
}

import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { CapturarCodigo } from '../componentes/CapturarCodigo'
import { FotoProducto } from '../componentes/FotoProducto'
import { Boton, Campo, CampoNumero, Hoja, Vacio } from '../componentes/UI'
import { db, guardarFoto, type Producto, type TipoVenta } from '../db/db'
import { normalizar, plata, SIMBOLO } from '../lib/formato'
import { achicarFoto } from '../lib/imagen'
import { puede, type Sesion } from '../lib/usuarios'

const VACIO: Omit<Producto, 'id'> = {
  nombre: '',
  categoriaId: 0,
  tipoVenta: 'unidad',
  precioVenta: 0,
  precioCosto: 0,
  stock: 0,
  stockMinimo: 0,
  activo: 1,
}

export function Productos({ sesion, onAviso }: { sesion: Sesion; onAviso: (t: string) => void }) {
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Producto | null>(null)
  const verCostos = puede(sesion, 'verCostos')

  const categorias = useLiveQuery(() => db.categorias.orderBy('orden').toArray(), [], [])
  const productos = useLiveQuery(() => db.productos.toArray(), [], [])

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim())
    return productos
      .filter((p) => texto === '' || normalizar(p.nombre).includes(texto) || p.codigoBarras?.includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [productos, busqueda])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-2 border-b border-slate-200 bg-white p-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar..."
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-marca-500"
        />
        <button
          onClick={() => setEditando({ ...VACIO, categoriaId: categorias[0]?.id ?? 0 })}
          className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-marca-600 text-2xl text-white active:bg-marca-700"
          aria-label="Nuevo producto"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visibles.length === 0 ? (
          <Vacio icono="📦" texto="No hay productos" />
        ) : (
          <div className="divide-y divide-slate-100">
            {visibles.map((p) => (
              <button
                key={p.id}
                onClick={() => setEditando(p)}
                className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left active:bg-slate-50"
              >
                <FotoProducto producto={p} className="h-11 w-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.nombre}</div>
                  <div className="text-xs text-slate-500">
                    Stock: {p.stock.toFixed(p.tipoVenta === 'peso' ? 1 : 0)}
                    {p.tipoVenta === 'peso' ? ' kg' : ' u.'}
                    {p.stock <= p.stockMinimo && (
                      <span className="ml-2 font-semibold text-amber-600">¡Poco stock!</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold text-marca-700">{plata(p.precioVenta)}</div>
                  {p.tipoVenta === 'peso' && <div className="text-[10px] text-slate-400">por kilo</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <EditorProducto
        key={editando?.id ?? 'nuevo'}
        producto={editando}
        categorias={categorias}
        verCostos={verCostos}
        onCerrar={() => setEditando(null)}
        onAviso={onAviso}
      />
    </div>
  )
}

interface EditorProps {
  producto: Producto | null
  categorias: { id?: number; nombre: string }[]
  verCostos: boolean
  onCerrar: () => void
  onAviso: (t: string) => void
}

function EditorProducto({ producto, categorias, verCostos, onCerrar, onAviso }: EditorProps) {
  const [borrador, setBorrador] = useState<Producto | null>(null)
  const [escaneando, setEscaneando] = useState(false)
  /** Foto elegida en esta edición; se graba recién al guardar. */
  const [fotoNueva, setFotoNueva] = useState<Blob | null>(null)

  // Se copia el producto al abrir para poder cancelar sin haber tocado la base.
  const actual = borrador ?? producto
  if (!producto || !actual) return null

  const set = <K extends keyof Producto>(clave: K, valor: Producto[K]) =>
    setBorrador({ ...actual, [clave]: valor })

  const cerrar = () => {
    setBorrador(null)
    onCerrar()
  }

  const guardar = async () => {
    if (!actual.nombre.trim()) {
      onAviso('Escribe un nombre para el producto')
      return
    }
    const esNuevo = actual.id === undefined
    let id: number
    if (esNuevo) {
      id = await db.productos.add(actual)
    } else {
      await db.productos.put(actual)
      id = actual.id!
    }

    if (fotoNueva) await guardarFoto(id, fotoNueva)

    onAviso(esNuevo ? 'Producto creado' : 'Producto guardado')
    cerrar()
  }

  const borrar = async () => {
    if (actual.id === undefined) return
    // Baja lógica: si se borrara de verdad, las ventas viejas quedarían
    // apuntando a un producto inexistente.
    await db.productos.update(actual.id, { activo: 0 })
    onAviso('Producto dado de baja')
    cerrar()
  }

  const ganancia = actual.precioVenta - actual.precioCosto
  const margen = actual.precioCosto > 0 ? (ganancia / actual.precioCosto) * 100 : 0

  return (
    <Hoja
      abierta
      onCerrar={cerrar}
      titulo={actual.id === undefined ? 'Nuevo producto' : 'Editar producto'}
      alta
    >
      <div className="space-y-4 p-4">
        <Campo etiqueta="Nombre" valor={actual.nombre} onCambio={(v) => set('nombre', v)} requerido />

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-600">Cómo se vende</span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['unidad', 'Por unidad'],
                ['peso', 'Por peso'],
                ['atado', 'Por atado'],
              ] as [TipoVenta, string][]
            ).map(([id, etiqueta]) => (
              <button
                key={id}
                onClick={() => set('tipoVenta', id)}
                className={`h-12 rounded-xl border-2 text-sm font-semibold ${
                  actual.tipoVenta === id
                    ? 'border-marca-600 bg-marca-50 text-marca-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className={verCostos ? 'grid grid-cols-2 gap-3' : ''}>
          <CampoNumero
            etiqueta={actual.tipoVenta === 'peso' ? 'Precio por kilo' : 'Precio de venta'}
            valor={actual.precioVenta}
            onCambio={(n) => set('precioVenta', n)}
            prefijo={SIMBOLO}
            placeholder="0"
          />
          {verCostos && (
            <CampoNumero
              etiqueta="Precio de costo"
              valor={actual.precioCosto}
              onCambio={(n) => set('precioCosto', n)}
              prefijo={SIMBOLO}
              placeholder="0"
            />
          )}
        </div>

        {verCostos && actual.precioVenta > 0 && actual.precioCosto > 0 && (
          <div
            className={`rounded-xl px-4 py-3 text-center text-sm ${
              ganancia > 0 ? 'bg-marca-50 text-marca-800' : 'bg-red-50 text-red-700'
            }`}
          >
            Ganas <strong>{plata(ganancia)}</strong> por {actual.tipoVenta === 'peso' ? 'kilo' : 'unidad'} ·{' '}
            <strong>{margen.toFixed(0)}%</strong> sobre el costo
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Los productos por peso llevan 3 decimales, como la balanza. */}
          <CampoNumero
            etiqueta="Stock actual"
            valor={actual.stock}
            onCambio={(n) => set('stock', n)}
            decimales={actual.tipoVenta === 'peso' ? 3 : 0}
            sufijo={actual.tipoVenta === 'peso' ? 'kg' : 'u.'}
            placeholder="0"
          />
          <CampoNumero
            etiqueta="Avisar bajo"
            valor={actual.stockMinimo}
            onCambio={(n) => set('stockMinimo', n)}
            decimales={actual.tipoVenta === 'peso' ? 3 : 0}
            sufijo={actual.tipoVenta === 'peso' ? 'kg' : 'u.'}
            placeholder="0"
          />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-600">Código de barras</span>
          <div className="flex gap-2">
            <input
              value={actual.codigoBarras ?? ''}
              onChange={(e) => set('codigoBarras', e.target.value.trim() || undefined)}
              inputMode="numeric"
              placeholder="Las verduras no suelen tener"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-100"
            />
            <button
              onClick={() => setEscaneando(true)}
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-marca-600 text-2xl text-white active:bg-marca-700"
              aria-label="Escanear código de barras"
            >
              ⌷
            </button>
          </div>
        </div>

        <Campo
          etiqueta="Emoji (se muestra en la botonera)"
          valor={actual.emoji ?? ''}
          onCambio={(v) => set('emoji', v.slice(0, 2) || undefined)}
          placeholder="🍅"
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Categoría</span>
          <select
            value={actual.categoriaId}
            onChange={(e) => set('categoriaId', Number(e.target.value))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-marca-500"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Foto</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const archivo = e.target.files?.[0]
              if (!archivo) return
              // Se achica antes de guardar: una foto de cámara pesa varios MB
              // y acá se usa para una miniatura.
              setFotoNueva(await achicarFoto(archivo))
              set('tieneFoto', 1)
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
          />
        </label>

        <Boton onClick={guardar} className="w-full text-lg">
          Guardar
        </Boton>

        {actual.id !== undefined && actual.activo === 1 && (
          <Boton tipo="fantasma" onClick={borrar} className="w-full text-red-600">
            Dar de baja
          </Boton>
        )}
      </div>

      <CapturarCodigo
        abierto={escaneando}
        productoId={actual.id}
        onCerrar={() => setEscaneando(false)}
        onCodigo={(codigo) => {
          set('codigoBarras', codigo)
          onAviso(`Código ${codigo} cargado`)
        }}
      />
    </Hoja>
  )
}

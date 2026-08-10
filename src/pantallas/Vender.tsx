import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo, useRef, useState } from 'react'
import { CargarItem } from '../componentes/CargarItem'
import { FotoProducto } from '../componentes/FotoProducto'
import { Boton, Vacio } from '../componentes/UI'
import { VisorCamara } from '../componentes/VisorCamara'
import { db, type Producto, type Venta, type VentaItem } from '../db/db'
import type { Sesion } from '../lib/usuarios'
import { cantidadTexto, normalizar, plata } from '../lib/formato'
import { Cobrar } from './Cobrar'

interface Props {
  sesion: Sesion
  onVentaLista: (venta: Venta) => void
  onAviso: (texto: string) => void
}

type Modo = 'escanear' | 'buscar'

export function Vender({ sesion, onVentaLista, onAviso }: Props) {
  const [carrito, setCarrito] = useState<VentaItem[]>([])
  const [modo, setModo] = useState<Modo>('escanear')
  const [busqueda, setBusqueda] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [aCargar, setACargar] = useState<Producto | null>(null)
  const [cobrando, setCobrando] = useState(false)

  const categorias = useLiveQuery(() => db.categorias.orderBy('orden').toArray(), [], [])
  const productos = useLiveQuery(() => db.productos.where('activo').equals(1).toArray(), [], [])

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim())
    return productos
      .filter((p) => (categoriaId === null ? true : p.categoriaId === categoriaId))
      .filter((p) => (texto === '' ? true : normalizar(p.nombre).includes(texto)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [productos, busqueda, categoriaId])

  const total = carrito.reduce((s, i) => s + i.subtotal, 0)

  const agregar = useCallback((item: VentaItem) => {
    setCarrito((c) => {
      // Los productos por unidad se acumulan en una sola línea; los pesados no,
      // porque cada pesada es una carga distinta que conviene ver por separado.
      const i = c.findIndex((x) => x.productoId === item.productoId && x.tipoVenta !== 'peso')
      if (i === -1) return [...c, item]
      const copia = [...c]
      const previo = copia[i]
      copia[i] = {
        ...previo,
        cantidad: previo.cantidad + item.cantidad,
        subtotal: previo.subtotal + item.subtotal,
      }
      return copia
    })
  }, [])

  // La lista se autodesplaza al último cargado: con la cámara arriba, lo nuevo
  // entra abajo y quedaría fuera de vista.
  const finLista = useRef<HTMLDivElement>(null)

  const alEscanear = useCallback(
    async (codigo: string) => {
      const producto = await db.productos.where('codigoBarras').equals(codigo).first()
      if (!producto || producto.activo !== 1) {
        onAviso(`Código ${codigo} sin producto cargado`)
        return
      }
      // Los de unidad entran derecho: escanear y seguir es lo que hace rápida
      // la caja. Los pesados abren el teclado porque falta saber el peso.
      if (producto.tipoVenta === 'unidad') {
        agregar({
          productoId: producto.id,
          nombre: producto.nombre,
          tipoVenta: 'unidad',
          cantidad: 1,
          precioUnit: producto.precioVenta,
          subtotal: producto.precioVenta,
        })
        onAviso(`${producto.nombre} · ${plata(producto.precioVenta)}`)
        requestAnimationFrame(() => finLista.current?.scrollIntoView({ behavior: 'smooth' }))
      } else {
        setACargar(producto)
      }
    },
    [agregar, onAviso],
  )

  const confirmarVenta = async (
    metodoPago: Venta['metodoPago'],
    descuento: number,
    pagoCon?: number,
  ) => {
    const subtotal = total
    const venta: Venta = {
      fecha: new Date(),
      usuarioId: sesion.usuario.id,
      usuarioNombre: sesion.usuario.nombre,
      items: carrito,
      subtotal,
      descuento,
      total: subtotal - descuento,
      metodoPago,
      pagoCon,
      vuelto: pagoCon ? pagoCon - (subtotal - descuento) : undefined,
      estado: 'completada',
    }

    const id = await db.transaction('rw', db.ventas, db.productos, async () => {
      const nuevoId = await db.ventas.add(venta)
      for (const item of carrito) {
        if (item.productoId === undefined) continue
        const p = await db.productos.get(item.productoId)
        if (p) await db.productos.update(item.productoId, { stock: p.stock - item.cantidad })
      }
      return nuevoId
    })

    setCarrito([])
    setCobrando(false)
    setBusqueda('')
    setModo('escanear')
    onVentaLista({ ...venta, id })
  }

  // Con un diálogo abierto encima, la cámara sigue prendida pero no dispara
  // lecturas: si no, escanearía lo que esté enfrente mientras se cobra.
  const camaraPausada = aCargar !== null || cobrando

  return (
    <div className="flex h-full flex-col">
      {/*
        El visor no se desmonta al pasar a la vista sin código: solo se oculta
        y se pausa. Así alternar entre las dos es instantáneo, en vez de tener
        que reabrir la cámara cada vez.
      */}
      <VisorCamara
        onCodigo={alEscanear}
        pausado={camaraPausada || modo !== 'escanear'}
        oculto={modo !== 'escanear'}
        onSinCamara={(motivo) => {
          onAviso(`${motivo}. Busca los productos en la lista.`)
          setModo('buscar')
        }}
      />

      {modo === 'buscar' && (
        <div className="shrink-0 space-y-2 border-b border-slate-200 bg-white px-3 pt-3 pb-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-marca-500"
          />
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Chip activo={categoriaId === null} onClick={() => setCategoriaId(null)}>
              Todo
            </Chip>
            {categorias.map((c) => (
              <Chip
                key={c.id}
                activo={categoriaId === c.id}
                color={c.color}
                onClick={() => setCategoriaId(c.id!)}
              >
                {c.nombre}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-200 bg-white p-2">
        <BotonModo activo={modo === 'escanear'} onClick={() => setModo('escanear')}>
          📷 Escanear
        </BotonModo>
        <BotonModo activo={modo === 'buscar'} onClick={() => setModo('buscar')}>
          🥬 Sin código
        </BotonModo>
      </div>

      {modo === 'buscar' ? (
        <div className="flex-1 overflow-y-auto p-3">
          {visibles.length === 0 ? (
            <Vacio icono="🔍" texto="No hay productos que coincidan" />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {visibles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setACargar(p)}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left active:border-marca-500 active:bg-marca-50"
                >
                  <FotoProducto producto={p} className="h-16 w-full" />
                  <div className="flex flex-1 flex-col justify-between p-2">
                    <span className="line-clamp-2 text-xs leading-tight font-medium">{p.nombre}</span>
                    <span className="mt-1 text-sm font-bold text-marca-700">
                      {plata(p.precioVenta)}
                      {p.tipoVenta === 'peso' && (
                        <span className="text-[10px] font-normal text-slate-400">/kg</span>
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {carrito.length === 0 ? (
            <Vacio icono="🛒" texto="Escanea un producto para empezar" />
          ) : (
            <>
              {carrito.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-slate-100 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.nombre}</div>
                    <div className="text-xs text-slate-500">
                      {cantidadTexto(item.cantidad, item.tipoVenta)} × {plata(item.precioUnit)}
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{plata(item.subtotal)}</span>
                  <button
                    onClick={() => setCarrito((c) => c.filter((_, j) => j !== i))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-red-500 active:bg-red-50"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div ref={finLista} />
            </>
          )}
        </div>
      )}

      {carrito.length > 0 && (
        <div className="shrink-0 border-t border-slate-200 bg-white">
          {modo === 'buscar' && (
            <div className="max-h-32 overflow-y-auto">
              {carrito.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.nombre}</div>
                    <div className="text-xs text-slate-500">
                      {cantidadTexto(item.cantidad, item.tipoVenta)} × {plata(item.precioUnit)}
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums">{plata(item.subtotal)}</span>
                  <button
                    onClick={() => setCarrito((c) => c.filter((_, j) => j !== i))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-red-500 active:bg-red-50"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 p-3">
            <button
              onClick={() => setCarrito([])}
              className="h-[52px] shrink-0 rounded-xl px-4 text-sm font-medium text-slate-500 active:bg-slate-100"
            >
              Vaciar
            </button>
            <Boton onClick={() => setCobrando(true)} className="flex-1 text-lg">
              Cobrar {plata(total)}
            </Boton>
          </div>
        </div>
      )}

      <CargarItem producto={aCargar} onCerrar={() => setACargar(null)} onAgregar={agregar} />
      <Cobrar
        abierto={cobrando}
        total={total}
        onCerrar={() => setCobrando(false)}
        onConfirmar={confirmarVenta}
      />
    </div>
  )
}

function BotonModo({
  children,
  activo,
  onClick,
}: {
  children: React.ReactNode
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 rounded-xl text-sm font-semibold transition-colors ${
        activo ? 'bg-marca-600 text-white' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </button>
  )
}

function Chip({
  children,
  activo,
  color,
  onClick,
}: {
  children: React.ReactNode
  activo: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={activo && color ? { backgroundColor: color, borderColor: color } : undefined}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
        activo
          ? color
            ? 'text-white'
            : 'border-marca-600 bg-marca-600 text-white'
          : 'border-slate-300 bg-white text-slate-600'
      }`}
    >
      {children}
    </button>
  )
}

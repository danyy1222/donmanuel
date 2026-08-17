import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { FotoProducto } from '../componentes/FotoProducto'
import { Boton, Campo, CampoNumero, Hoja, Vacio } from '../componentes/UI'
import { db, type MovStock, type Producto, type TipoMovStock } from '../db/db'
import { cantidadTexto, fechaCorta, normalizar, plata } from '../lib/formato'
import { ajustarStock, estaBajo, moverStock } from '../lib/stock'
import type { Sesion } from '../lib/usuarios'

type Accion = Exclude<TipoMovStock, 'venta'>

const ACCIONES: { id: Accion; etiqueta: string; icono: string; explicacion: string }[] = [
  {
    id: 'entrada',
    etiqueta: 'Entrada',
    icono: '📥',
    explicacion: 'Llegó mercadería del proveedor.',
  },
  {
    id: 'merma',
    etiqueta: 'Merma',
    icono: '🗑️',
    explicacion: 'Se pudrió, se secó o se rompió. Sale del stock y queda anotado lo que costó.',
  },
  {
    id: 'ajuste',
    etiqueta: 'Conteo',
    icono: '📋',
    explicacion: 'Contaste lo que hay de verdad y el sistema lo corrige.',
  },
]

/** Motivos de merma más comunes en verdulería, para no tener que escribirlos. */
const MOTIVOS_MERMA = ['Se pudrió', 'Se secó', 'Se cayó', 'Vencido', 'Roto']

export function Stock({ sesion, onAviso }: { sesion: Sesion; onAviso: (t: string) => void }) {
  const [busqueda, setBusqueda] = useState('')
  const [elegido, setElegido] = useState<Producto | null>(null)
  const [verHistorial, setVerHistorial] = useState(false)

  const productos = useLiveQuery(() => db.productos.where('activo').equals(1).toArray(), [], [])

  const bajos = useMemo(() => productos.filter(estaBajo), [productos])

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim())
    return productos
      .filter((p) => texto === '' || normalizar(p.nombre).includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [productos, busqueda])

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 border-b border-slate-200 bg-white p-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-marca-500"
        />
        <button
          onClick={() => setVerHistorial(true)}
          className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 active:bg-slate-200"
        >
          <span>🕑 Historial de movimientos</span>
          <span className="text-slate-400">→</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/*
          Lo que se está por acabar va arriba de todo. Es la pregunta que se
          hace de verdad al abrir esta pantalla: qué hay que comprar mañana.
        */}
        {bajos.length > 0 && busqueda === '' && (
          <section className="border-b-4 border-slate-100 bg-amber-50 p-3">
            <h2 className="mb-2 text-sm font-bold text-amber-900">
              ⚠️ Se está acabando ({bajos.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {bajos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setElegido(p)}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 active:bg-amber-100"
                >
                  {p.nombre}{' '}
                  <span className="tabular-nums opacity-60">
                    {cantidadTexto(p.stock, p.tipoVenta)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {visibles.length === 0 ? (
          <Vacio icono="📦" texto="No hay productos" />
        ) : (
          <div className="divide-y divide-slate-100">
            {visibles.map((p) => (
              <button
                key={p.id}
                onClick={() => setElegido(p)}
                className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left active:bg-slate-50"
              >
                <FotoProducto producto={p} className="h-11 w-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.nombre}</div>
                  <div className="text-xs text-slate-500">
                    Vale {plata(p.stock * p.precioCosto)} al costo
                  </div>
                </div>
                <span
                  className={`shrink-0 text-right font-bold tabular-nums ${
                    estaBajo(p) ? 'text-amber-600' : p.stock <= 0 ? 'text-red-600' : 'text-slate-700'
                  }`}
                >
                  {cantidadTexto(p.stock, p.tipoVenta)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MoverProducto
        producto={elegido}
        usuarioNombre={sesion.usuario.nombre}
        onCerrar={() => setElegido(null)}
        onAviso={onAviso}
      />

      <Historial abierto={verHistorial} onCerrar={() => setVerHistorial(false)} />
    </div>
  )
}

function MoverProducto({
  producto,
  usuarioNombre,
  onCerrar,
  onAviso,
}: {
  producto: Producto | null
  usuarioNombre: string
  onCerrar: () => void
  onAviso: (t: string) => void
}) {
  const [accion, setAccion] = useState<Accion>('entrada')
  const [cantidad, setCantidad] = useState(0)
  const [motivo, setMotivo] = useState('')

  if (!producto) return null

  const decimales = producto.tipoVenta === 'peso' ? 3 : 0
  const unidad = producto.tipoVenta === 'peso' ? 'kg' : 'u.'

  const cerrar = () => {
    setAccion('entrada')
    setCantidad(0)
    setMotivo('')
    onCerrar()
  }

  const queda =
    accion === 'ajuste'
      ? cantidad
      : Math.round((producto.stock + (accion === 'entrada' ? cantidad : -cantidad)) * 1000) / 1000

  const guardar = async () => {
    const detalle = { motivo: motivo.trim() || undefined, usuarioNombre }
    if (accion === 'ajuste') {
      await ajustarStock(producto.id!, cantidad, detalle)
      onAviso(`${producto.nombre}: quedó en ${cantidadTexto(cantidad, producto.tipoVenta)}`)
    } else {
      await moverStock(
        producto.id!,
        accion,
        accion === 'entrada' ? cantidad : -cantidad,
        detalle,
      )
      onAviso(
        accion === 'entrada'
          ? `Entraron ${cantidadTexto(cantidad, producto.tipoVenta)} de ${producto.nombre}`
          : `Merma anotada: ${plata(cantidad * producto.precioCosto)} perdidos`,
      )
    }
    cerrar()
  }

  const detalle = ACCIONES.find((a) => a.id === accion)!

  return (
    <Hoja abierta onCerrar={cerrar} titulo={producto.nombre} alta>
      <div className="space-y-4 p-4">
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
          <div className="text-sm text-slate-500">Ahora hay</div>
          <div className="text-2xl font-bold tabular-nums">
            {cantidadTexto(producto.stock, producto.tipoVenta)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {ACCIONES.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setAccion(a.id)
                setCantidad(0)
                setMotivo('')
              }}
              className={`flex h-[68px] flex-col items-center justify-center gap-1 rounded-xl border-2 ${
                accion === a.id
                  ? 'border-marca-600 bg-marca-50 text-marca-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span className="text-2xl leading-none">{a.icono}</span>
              <span className="text-xs font-semibold">{a.etiqueta}</span>
            </button>
          ))}
        </div>

        <p className="text-sm text-slate-500">{detalle.explicacion}</p>

        <CampoNumero
          etiqueta={
            accion === 'entrada'
              ? 'Cuánto entró'
              : accion === 'merma'
                ? 'Cuánto se perdió'
                : 'Cuánto hay de verdad'
          }
          valor={cantidad}
          onCambio={setCantidad}
          decimales={decimales}
          sufijo={unidad}
          placeholder="0"
        />

        {accion === 'merma' && (
          <>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS_MERMA.map((m) => (
                <button
                  key={m}
                  onClick={() => setMotivo(m)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    motivo === m
                      ? 'border-marca-600 bg-marca-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {cantidad > 0 && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-red-700">
                Se pierden <strong>{plata(cantidad * producto.precioCosto)}</strong> al costo
              </div>
            )}
          </>
        )}

        {accion !== 'merma' && (
          <Campo
            etiqueta="Nota (opcional)"
            valor={motivo}
            onCambio={setMotivo}
            placeholder={accion === 'entrada' ? 'Compra en el mercado' : 'Conteo del lunes'}
          />
        )}

        {cantidad > 0 && (
          <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
            <span className="text-sm text-slate-500">Queda en </span>
            <strong className="tabular-nums">
              {cantidadTexto(queda, producto.tipoVenta)}
            </strong>
          </div>
        )}

        <Boton onClick={guardar} disabled={cantidad <= 0} className="w-full text-lg">
          Guardar
        </Boton>
      </div>
    </Hoja>
  )
}

function Historial({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const movimientos = useLiveQuery(
    () => (abierto ? db.movStock.orderBy('fecha').reverse().limit(120).toArray() : []),
    [abierto],
    [],
  )

  return (
    <Hoja abierta={abierto} onCerrar={onCerrar} titulo="Movimientos de stock" alta>
      {movimientos.length === 0 ? (
        <Vacio icono="🕑" texto="Todavía no hay movimientos" />
      ) : (
        <div className="divide-y divide-slate-100">
          {movimientos.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xl">{ICONO[m.tipo]}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.nombre}</div>
                <div className="truncate text-xs text-slate-500">
                  {fechaCorta(m.fecha)}
                  {m.motivo && ` · ${m.motivo}`}
                  {m.usuarioNombre && ` · ${m.usuarioNombre}`}
                </div>
              </div>
              <span
                className={`shrink-0 font-semibold tabular-nums ${
                  m.cantidad > 0 ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {m.cantidad > 0 ? '+' : ''}
                {formatoCantidad(m)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Hoja>
  )
}

const ICONO: Record<TipoMovStock, string> = {
  venta: '🛒',
  entrada: '📥',
  merma: '🗑️',
  ajuste: '📋',
}

/** Los kilos se muestran con decimales y las unidades enteras. */
function formatoCantidad(m: MovStock): string {
  return Number.isInteger(m.cantidad) ? String(m.cantidad) : m.cantidad.toFixed(3)
}

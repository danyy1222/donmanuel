import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Vacio } from '../componentes/UI'
import { db, type MetodoPago } from '../db/db'
import { plata } from '../lib/formato'
import { METODOS_PAGO, nombreMetodo } from '../lib/pagos'

type Periodo = 'hoy' | 'semana' | 'mes'

const PERIODOS: { id: Periodo; etiqueta: string; dias: number }[] = [
  { id: 'hoy', etiqueta: 'Hoy', dias: 0 },
  { id: 'semana', etiqueta: '7 días', dias: 6 },
  { id: 'mes', etiqueta: '30 días', dias: 29 },
]

interface Resumen {
  ventas: number
  vendido: number
  ganancia: number
  /** Ítems vendidos sin costo guardado: la ganancia queda inflada por ellos. */
  sinCosto: number
  ticket: number
  porMetodo: { metodo: MetodoPago; monto: number }[]
  top: { nombre: string; cantidad: number; monto: number }[]
  merma: number
  porHora: number[]
}

export function Reportes() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy')

  const datos = useLiveQuery(async () => calcular(periodo), [periodo], null)

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-200 p-1">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
              periodo === p.id ? 'bg-white text-marca-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {!datos || datos.ventas === 0 ? (
        <Vacio icono="📊" texto="Todavía no hay ventas en este período" />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3">
            <Tarjeta titulo="Vendido" valor={plata(datos.vendido)} destacada />
            <Tarjeta titulo="Ganancia" valor={plata(datos.ganancia)} destacada />
            <Tarjeta titulo="Ventas" valor={String(datos.ventas)} />
            <Tarjeta titulo="Promedio por venta" valor={plata(datos.ticket)} />
          </section>

          {datos.sinCosto > 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {datos.sinCosto} {datos.sinCosto === 1 ? 'producto vendido no tiene' : 'productos vendidos no tienen'} el
              costo cargado, así que la ganancia sale más alta de lo real. Cargá el precio de costo
              en Productos.
            </p>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-bold">Cómo te pagaron</h2>
            <div className="space-y-2">
              {datos.porMetodo.map((m) => (
                <Barra
                  key={m.metodo}
                  etiqueta={nombreMetodo(m.metodo)}
                  monto={m.monto}
                  maximo={datos.porMetodo[0].monto}
                  color={METODOS_PAGO.find((x) => x.id === m.metodo)?.color ?? '#7e22ce'}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-bold">Lo que más se vende</h2>
            <div className="divide-y divide-slate-100 text-sm">
              {datos.top.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                  <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                    {redondo(p.cantidad)}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{plata(p.monto)}</span>
                </div>
              ))}
            </div>
          </section>

          {datos.merma > 0 && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h2 className="font-bold text-red-900">Perdido en merma</h2>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-700">
                {plata(datos.merma)}
              </p>
              <p className="mt-1 text-sm text-red-800">
                Es {((datos.merma / Math.max(datos.vendido, 1)) * 100).toFixed(1)}% de lo que
                vendiste. Sale de la ganancia de arriba.
              </p>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-1 font-bold">A qué hora se vende</h2>
            <p className="mb-3 text-sm text-slate-500">
              Sirve para saber cuándo conviene tener más gente en el mostrador.
            </p>
            <Horas valores={datos.porHora} />
          </section>
        </>
      )}
    </div>
  )
}

async function calcular(periodo: Periodo): Promise<Resumen> {
  const dias = PERIODOS.find((p) => p.id === periodo)!.dias
  const desde = new Date()
  desde.setHours(0, 0, 0, 0)
  desde.setDate(desde.getDate() - dias)

  // Se consulta por el índice de fecha en vez de traer el historial entero: con
  // miles de ventas acumuladas, filtrarlas en memoria traba la pantalla.
  const ventas = (await db.ventas.where('fecha').aboveOrEqual(desde).toArray()).filter(
    (v) => v.estado === 'completada',
  )

  const movimientos = await db.movStock.where('fecha').aboveOrEqual(desde).toArray()
  const merma = movimientos
    .filter((m) => m.tipo === 'merma')
    .reduce((s, m) => s + Math.abs(m.cantidad) * m.costoUnit, 0)

  const vendido = ventas.reduce((s, v) => s + v.total, 0)
  const costo = ventas.reduce(
    (s, v) => s + v.items.reduce((t, i) => t + (i.costoUnit ?? 0) * i.cantidad, 0),
    0,
  )
  const sinCosto = ventas.reduce(
    (s, v) => s + v.items.filter((i) => i.costoUnit === undefined || i.costoUnit === 0).length,
    0,
  )

  const porMetodo = new Map<MetodoPago, number>()
  for (const v of ventas) porMetodo.set(v.metodoPago, (porMetodo.get(v.metodoPago) ?? 0) + v.total)

  const acumulado = new Map<string, { cantidad: number; monto: number }>()
  for (const v of ventas) {
    for (const i of v.items) {
      const previo = acumulado.get(i.nombre) ?? { cantidad: 0, monto: 0 }
      acumulado.set(i.nombre, {
        cantidad: previo.cantidad + i.cantidad,
        monto: previo.monto + i.subtotal,
      })
    }
  }

  const porHora = Array(24).fill(0) as number[]
  for (const v of ventas) porHora[new Date(v.fecha).getHours()] += v.total

  return {
    ventas: ventas.length,
    vendido: redondear(vendido),
    // La merma se descuenta: mercadería que se compró y no se vendió es
    // plata perdida igual que si se hubiera vendido a pérdida.
    ganancia: redondear(vendido - costo - merma),
    sinCosto,
    ticket: redondear(vendido / Math.max(ventas.length, 1)),
    porMetodo: [...porMetodo]
      .map(([metodo, monto]) => ({ metodo, monto: redondear(monto) }))
      .sort((a, b) => b.monto - a.monto),
    top: [...acumulado]
      .map(([nombre, d]) => ({ nombre, ...d }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 8),
    merma: redondear(merma),
    porHora,
  }
}

function Tarjeta({
  titulo,
  valor,
  destacada,
}: {
  titulo: string
  valor: string
  destacada?: boolean
}) {
  return (
    <div
      className={`rounded-xl px-3 py-4 text-center ${
        destacada ? 'bg-marca-600 text-white' : 'border border-slate-200 bg-white'
      }`}
    >
      <div className="truncate text-xl font-bold tabular-nums">{valor}</div>
      <div className={`text-[11px] ${destacada ? 'opacity-80' : 'text-slate-500'}`}>{titulo}</div>
    </div>
  )
}

function Barra({
  etiqueta,
  monto,
  maximo,
  color,
}: {
  etiqueta: string
  monto: number
  maximo: number
  color: string
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{etiqueta}</span>
        <span className="font-semibold tabular-nums">{plata(monto)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max((monto / Math.max(maximo, 1)) * 100, 3)}%`, background: color }}
        />
      </div>
    </div>
  )
}

/** Solo las horas con movimiento: un día de bodega no arranca a las 3 de la mañana. */
function Horas({ valores }: { valores: number[] }) {
  const conVenta = valores.map((v, h) => ({ h, v })).filter((x) => x.v > 0)
  if (conVenta.length === 0) return <p className="text-sm text-slate-400">Sin datos.</p>

  const desde = conVenta[0].h
  const hasta = conVenta[conVenta.length - 1].h
  const maximo = Math.max(...valores)

  return (
    <div className="flex items-end gap-1" style={{ height: 90 }}>
      {valores.slice(desde, hasta + 1).map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-marca-500"
              style={{ height: `${Math.max((v / maximo) * 100, 2)}%` }}
              title={plata(v)}
            />
          </div>
          <span className="text-[9px] text-slate-400 tabular-nums">{desde + i}</span>
        </div>
      ))}
    </div>
  )
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

function redondo(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

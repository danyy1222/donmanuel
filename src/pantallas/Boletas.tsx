import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { AccionesBoleta } from '../componentes/CrearBoleta'
import { Hoja, Vacio } from '../componentes/UI'
import { db, type Boleta } from '../db/db'
import { fechaHora, plata } from '../lib/formato'

/**
 * Historial de boletas. Toda boleta creada queda acá para poder reenviarla a
 * otro número o volver a guardarla sin tener que rehacerla.
 */
export function Boletas({ onAviso }: { onAviso: (t: string) => void }) {
  const [abierta, setAbierta] = useState<Boleta | null>(null)
  const boletas = useLiveQuery(() => db.boletas.orderBy('id').reverse().toArray(), [], [])

  if (boletas.length === 0) {
    return (
      <Vacio
        icono="🧾"
        texto="Todavía no creaste ninguna boleta. Cuando un cliente pida comprobante, tocá «Crear boleta» al terminar la venta."
      />
    )
  }

  return (
    <>
      <div className="divide-y divide-slate-100">
        {boletas.map((b) => (
          <button
            key={b.id}
            onClick={() => setAbierta(b)}
            className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left active:bg-slate-50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">{b.numero}</span>
                {b.enviada === 1 && (
                  <span className="rounded-full bg-marca-100 px-2 py-0.5 text-[10px] font-semibold text-marca-700">
                    ENVIADA
                  </span>
                )}
              </div>
              <div className="truncate text-sm text-slate-500">
                {b.clienteNombre || 'Sin nombre'} · {fechaHora(b.fecha)}
              </div>
            </div>
            <span className="font-semibold tabular-nums">{plata(b.total)}</span>
          </button>
        ))}
      </div>

      <Hoja
        abierta={abierta !== null}
        onCerrar={() => setAbierta(null)}
        titulo={abierta ? `Boleta ${abierta.numero}` : ''}
        alta
      >
        {abierta && (
          <div className="space-y-4 p-4">
            <div className="rounded-xl border border-slate-200">
              {abierta.items.map((i, n) => (
                <div
                  key={n}
                  className="flex justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-0"
                >
                  <span className="min-w-0 flex-1 truncate">{i.nombre}</span>
                  <span className="ml-3 shrink-0 tabular-nums">{plata(i.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between bg-slate-50 px-3 py-3 font-bold">
                <span>TOTAL</span>
                <span className="tabular-nums">{plata(abierta.total)}</span>
              </div>
            </div>

            {abierta.enviada === 1 && abierta.fechaEnvio && (
              <p className="text-center text-xs text-slate-500">
                Enviada a {abierta.enviadaA} el {fechaHora(abierta.fechaEnvio)}
              </p>
            )}

            <AccionesBoleta boleta={abierta} onAviso={onAviso} />
          </div>
        )}
      </Hoja>
    </>
  )
}

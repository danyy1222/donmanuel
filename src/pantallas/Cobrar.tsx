import { useEffect, useState } from 'react'
import { Boton, CampoNumero, Hoja } from '../componentes/UI'
import { Teclado, aNumero, aplicarTecla } from '../componentes/Teclado'
import type { MetodoPago } from '../db/db'
import { plata, SIMBOLO } from '../lib/formato'
import { sugerirPagos } from '../lib/pagos'

interface Props {
  abierto: boolean
  total: number
  onCerrar: () => void
  onConfirmar: (metodo: MetodoPago, descuento: number, pagoCon?: number) => void
}

const METODOS: { id: MetodoPago; etiqueta: string; icono: string }[] = [
  { id: 'efectivo', etiqueta: 'Efectivo', icono: '💵' },
  { id: 'transferencia', etiqueta: 'Transfer.', icono: '📱' },
  { id: 'tarjeta', etiqueta: 'Tarjeta', icono: '💳' },
]

export function Cobrar({ abierto, total, onCerrar, onConfirmar }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [descuento, setDescuento] = useState(0)
  const [pagoCon, setPagoCon] = useState('')

  useEffect(() => {
    if (abierto) {
      setMetodo('efectivo')
      setDescuento(0)
      setPagoCon('')
    }
  }, [abierto])

  const dcto = Math.min(descuento, total)
  const aCobrar = total - dcto
  const entregado = aNumero(pagoCon)
  const vuelto = entregado - aCobrar
  const faltaPlata = metodo === 'efectivo' && entregado > 0 && vuelto < 0

  const sugerencias = sugerirPagos(aCobrar)

  return (
    <Hoja abierta={abierto} onCerrar={onCerrar} titulo="Cobrar" alta>
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-xl bg-marca-600 px-4 py-5 text-center text-white">
          <div className="text-sm opacity-80">Total a cobrar</div>
          <div className="text-4xl font-bold tabular-nums">{plata(aCobrar)}</div>
          {dcto > 0 && (
            <div className="mt-1 text-sm opacity-80">
              {plata(total)} − {plata(dcto)} de descuento
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METODOS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetodo(m.id)}
              className={`flex h-[68px] flex-col items-center justify-center gap-1 rounded-xl border-2 ${
                metodo === m.id
                  ? 'border-marca-600 bg-marca-50 text-marca-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span className="text-2xl leading-none">{m.icono}</span>
              <span className="text-xs font-semibold">{m.etiqueta}</span>
            </button>
          ))}
        </div>

        {metodo === 'efectivo' ? (
          <>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-600">Paga con</span>
                <span className="text-2xl font-bold tabular-nums">
                  {pagoCon ? plata(entregado) : '—'}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-4 gap-2">
                {sugerencias.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPagoCon(String(n))}
                    className="h-11 rounded-lg bg-slate-100 text-sm font-semibold tabular-nums active:bg-slate-300"
                  >
                    {plata(n)}
                  </button>
                ))}
              </div>

              <Teclado
                conComa={false}
                onTecla={(t) => setPagoCon((v) => aplicarTecla(v, t, false))}
                onBorrar={() => setPagoCon((v) => v.slice(0, -1))}
              />
            </div>

            <div
              className={`rounded-xl px-4 py-4 text-center ${
                faltaPlata ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-800'
              }`}
            >
              <div className="text-sm opacity-70">{faltaPlata ? 'Falta' : 'Vuelto'}</div>
              <div className="text-3xl font-bold tabular-nums">
                {entregado > 0 ? plata(Math.abs(vuelto)) : plata(0)}
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-xl bg-slate-100 px-4 py-6 text-center text-slate-600">
            Cobrar {plata(aCobrar)} por {metodo === 'tarjeta' ? 'tarjeta' : 'transferencia'} y
            confirmar cuando llegue el pago.
          </p>
        )}

        <details className="rounded-xl border border-slate-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-600">
            Aplicar descuento
          </summary>
          <div className="px-4 pb-4">
            <CampoNumero
              etiqueta="Cuánto se le descuenta"
              valor={descuento}
              onCambio={setDescuento}
              prefijo={SIMBOLO}
              placeholder="0"
            />
          </div>
        </details>

        <Boton
          onClick={() => onConfirmar(metodo, dcto, metodo === 'efectivo' ? entregado || undefined : undefined)}
          disabled={faltaPlata}
          className="w-full text-lg"
        >
          Confirmar venta
        </Boton>
      </div>
    </Hoja>
  )
}

import { useEffect, useState } from 'react'
import { Boton, CampoNumero, Hoja } from '../componentes/UI'
import { Teclado, aNumero, aplicarTecla } from '../componentes/Teclado'
import { leerConfig, leerImagen, type MetodoPago } from '../db/db'
import { plata, SIMBOLO } from '../lib/formato'
import { esEfectivo, METODOS_PAGO, nombreMetodo, sugerirPagos, usaQr } from '../lib/pagos'

interface Props {
  abierto: boolean
  total: number
  onCerrar: () => void
  onConfirmar: (metodo: MetodoPago, descuento: number, pagoCon?: number) => void
}

// Efectivo, Yape y Plin cubren casi todas las ventas de una bodega, así que van
// arriba y grandes. Tarjeta y transferencia quedan abajo, a un toque igual.
const FRECUENTES = METODOS_PAGO.filter((m) => m.id === 'efectivo' || usaQr(m.id))
const RESTO = METODOS_PAGO.filter((m) => !FRECUENTES.includes(m))

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
  const faltaPlata = esEfectivo(metodo) && entregado > 0 && vuelto < 0

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

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {FRECUENTES.map((m) => (
              <BotonMetodo key={m.id} {...m} activo={metodo === m.id} onClick={() => setMetodo(m.id)} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {RESTO.map((m) => (
              <BotonMetodo key={m.id} {...m} activo={metodo === m.id} onClick={() => setMetodo(m.id)} />
            ))}
          </div>
        </div>

        {esEfectivo(metodo) ? (
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
        ) : usaQr(metodo) ? (
          <CobroQr metodo={metodo} monto={aCobrar} />
        ) : (
          <p className="rounded-xl bg-slate-100 px-4 py-6 text-center text-slate-600">
            Cobrar {plata(aCobrar)} por {nombreMetodo(metodo).toLowerCase()} y confirmar cuando
            llegue el pago.
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
          onClick={() =>
            onConfirmar(metodo, dcto, esEfectivo(metodo) ? entregado || undefined : undefined)
          }
          disabled={faltaPlata}
          className="w-full text-lg"
        >
          Confirmar venta
        </Boton>
      </div>
    </Hoja>
  )
}

/**
 * Muestra el QR de la tienda para que el cliente lo escanee desde su Yape o su
 * Plin. Es la forma que no cobra comisión: el QR personal es fijo y no lleva el
 * monto adentro, así que el importe se muestra grande al lado para que el
 * cliente lo tipee, y se confirma a mano cuando llega la notificación.
 */
function CobroQr({ metodo, monto }: { metodo: MetodoPago; monto: number }) {
  const [qr, setQr] = useState<string | null>(null)
  const [numero, setNumero] = useState('')

  useEffect(() => {
    let url: string | null = null
    void (async () => {
      setNumero(await leerConfig(metodo === 'yape' ? 'yapeNumero' : 'plinNumero'))
      const blob = await leerImagen(`qr-${metodo}`)
      if (blob) {
        url = URL.createObjectURL(blob)
        setQr(url)
      } else {
        setQr(null)
      }
    })()
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [metodo])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      {qr ? (
        <img
          src={qr}
          alt={`QR de ${nombreMetodo(metodo)}`}
          className="mx-auto mb-3 w-full max-w-[240px] rounded-lg"
        />
      ) : (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Carga tu QR en Ajustes y aparece acá para que el cliente lo escanee.
        </p>
      )}

      <div className="text-sm text-slate-500">El cliente tiene que enviarte</div>
      <div className="text-3xl font-bold tabular-nums text-marca-700">{plata(monto)}</div>

      {numero && (
        <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          O a tu número <strong className="tabular-nums">{numero}</strong>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Confirma la venta recién cuando te llegue el aviso al celular.
      </p>
    </div>
  )
}

function BotonMetodo({
  etiqueta,
  icono,
  activo,
  onClick,
}: {
  etiqueta: string
  icono: string
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-[68px] flex-col items-center justify-center gap-1 rounded-xl border-2 ${
        activo
          ? 'border-marca-600 bg-marca-50 text-marca-700'
          : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      <span className="text-2xl leading-none">{icono}</span>
      <span className="text-xs font-semibold">{etiqueta}</span>
    </button>
  )
}

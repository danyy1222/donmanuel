import { useState } from 'react'
import type { Producto, VentaItem } from '../db/db'
import { kilos, plata, SIMBOLO } from '../lib/formato'
import { Boton, Hoja } from './UI'
import { Teclado, aNumero, aplicarTecla } from './Teclado'

interface Props {
  producto: Producto | null
  onCerrar: () => void
  onAgregar: (item: VentaItem) => void
}

type Modo = 'peso' | 'plata'

export function CargarItem({ producto, onCerrar, onAgregar }: Props) {
  const [modo, setModo] = useState<Modo>('peso')
  const [texto, setTexto] = useState('')

  if (!producto) return null

  const porPeso = producto.tipoVenta === 'peso'
  const conComa = porPeso && modo === 'peso'
  const valor = aNumero(texto)

  // Cuando se carga por plata, el peso sale de dividir el importe por el
  // precio del kilo: el cliente pide "$500 de papa" y hay que saber cuánto pesar.
  const cantidad = porPeso && modo === 'plata' ? valor / producto.precioVenta : valor
  const subtotal = porPeso && modo === 'plata' ? valor : valor * producto.precioVenta

  const cerrar = () => {
    setTexto('')
    setModo('peso')
    onCerrar()
  }

  const confirmar = () => {
    if (cantidad <= 0) return
    onAgregar({
      productoId: producto.id,
      nombre: producto.nombre,
      tipoVenta: producto.tipoVenta,
      cantidad: Math.round(cantidad * 1000) / 1000,
      precioUnit: producto.precioVenta,
      subtotal: Math.round(subtotal * 100) / 100,
    })
    cerrar()
  }

  return (
    <Hoja abierta onCerrar={cerrar} titulo={producto.nombre}>
      <div className="flex flex-col gap-4 p-4">
        <p className="text-center text-sm text-slate-500">
          {plata(producto.precioVenta)}
          {porPeso ? ' por kilo' : producto.tipoVenta === 'atado' ? ' por atado' : ' por unidad'}
        </p>

        {porPeso && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {(
              [
                ['peso', 'Por peso'],
                ['plata', 'Por monto'],
              ] as const
            ).map(([m, etiqueta]) => (
              <button
                key={m}
                onClick={() => {
                  setModo(m)
                  setTexto('')
                }}
                className={`h-11 rounded-lg font-semibold transition-colors ${
                  modo === m ? 'bg-white text-marca-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border-2 border-marca-200 bg-marca-50 px-4 py-5 text-center">
          <div className="text-4xl font-bold tabular-nums text-slate-900">
            {porPeso && modo === 'plata' ? `${SIMBOLO} ` : ''}
            {texto || '0'}
            {conComa ? ' kg' : ''}
          </div>
          <div className="mt-2 text-lg font-semibold text-marca-700">
            {cantidad > 0
              ? porPeso && modo === 'plata'
                ? `Pesar ${kilos(cantidad)}`
                : `= ${plata(subtotal)}`
              : porPeso && modo === 'plata'
                ? 'Escribe cuánto va a llevar'
                : 'Escribe la cantidad'}
          </div>
        </div>

        {!porPeso && (
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 6].map((n) => (
              <button
                key={n}
                onClick={() => setTexto(String(n))}
                className="h-12 rounded-xl bg-slate-100 font-semibold active:bg-slate-300"
              >
                {n}
              </button>
            ))}
          </div>
        )}

        <Teclado
          conComa={conComa}
          onTecla={(t) => setTexto((v) => aplicarTecla(v, t, conComa))}
          onBorrar={() => setTexto((v) => v.slice(0, -1))}
        />

        <Boton onClick={confirmar} disabled={cantidad <= 0} className="w-full text-lg">
          Agregar {cantidad > 0 && `· ${plata(subtotal)}`}
        </Boton>
      </div>
    </Hoja>
  )
}

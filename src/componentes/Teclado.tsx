import { SEPARADOR_DECIMAL } from '../lib/formato'

interface Props {
  onTecla: (t: string) => void
  onBorrar: () => void
  /** Oculta el punto decimal cuando solo se admiten enteros (unidades, atados). */
  conComa?: boolean
}

/**
 * Teclado propio en vez del teclado del sistema. En el mostrador conviene:
 * las teclas son mucho más grandes, no tapa media pantalla y no cambia de
 * tamaño según el celular.
 */
export function Teclado({ onTecla, onBorrar, conComa = true }: Props) {
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', conComa ? SEPARADOR_DECIMAL : '', '0', '⌫']

  return (
    <div className="grid grid-cols-3 gap-2">
      {teclas.map((t, i) =>
        t === '' ? (
          <div key={i} />
        ) : (
          <button
            key={i}
            onClick={() => (t === '⌫' ? onBorrar() : onTecla(t))}
            className="h-16 rounded-xl bg-slate-100 text-2xl font-semibold text-slate-800 active:bg-slate-300"
          >
            {t}
          </button>
        ),
      )}
    </div>
  )
}

/** Aplica una tecla sobre el texto actual, cuidando que quede un número válido. */
export function aplicarTecla(actual: string, tecla: string, conComa: boolean): string {
  if (tecla === SEPARADOR_DECIMAL) {
    if (!conComa || actual.includes(SEPARADOR_DECIMAL)) return actual
    return actual === '' ? `0${SEPARADOR_DECIMAL}` : `${actual}${SEPARADOR_DECIMAL}`
  }
  // Máximo 3 decimales: es lo que muestra una balanza (gramos).
  const [, dec] = actual.split(SEPARADOR_DECIMAL)
  if (dec !== undefined && dec.length >= 3) return actual
  if (actual === '0') return tecla
  return actual + tecla
}

export function aNumero(texto: string): number {
  const n = parseFloat(texto)
  return Number.isFinite(n) ? n : 0
}

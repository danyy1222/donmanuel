import { useEffect, useState, type ReactNode } from 'react'

interface BotonProps {
  children: ReactNode
  onClick?: () => void
  tipo?: 'principal' | 'secundario' | 'peligro' | 'fantasma'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}

const ESTILOS = {
  principal: 'bg-marca-600 text-white active:bg-marca-700 disabled:bg-slate-300',
  secundario: 'bg-white text-slate-700 border border-slate-300 active:bg-slate-100',
  peligro: 'bg-red-600 text-white active:bg-red-700',
  fantasma: 'bg-transparent text-slate-600 active:bg-slate-200',
}

/** Botón de mostrador: alto fijo de 52px para poder tocarlo sin mirar. */
export function Boton({
  children,
  onClick,
  tipo = 'principal',
  className = '',
  disabled,
  type = 'button',
}: BotonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[52px] items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors select-none ${ESTILOS[tipo]} ${className}`}
    >
      {children}
    </button>
  )
}

interface HojaProps {
  abierta: boolean
  onCerrar: () => void
  titulo: string
  children: ReactNode
  /** Deja la hoja a pantalla completa, para formularios largos. */
  alta?: boolean
}

/**
 * Panel que sube desde abajo. En el celular es más cómodo que un diálogo
 * centrado: queda al alcance del pulgar y no tapa lo que se estaba mirando.
 */
export function Hoja({ abierta, onCerrar, titulo, children, alta }: HojaProps) {
  useEffect(() => {
    if (!abierta) return
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alTeclear)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = ''
    }
  }, [abierta, onCerrar])

  if (!abierta) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div
        className={`area-segura-abajo relative flex flex-col rounded-t-2xl bg-white shadow-2xl ${
          // Las hojas altas llegan casi al borde: se les descuenta la barra de
          // estado para que el título no quede debajo de la hora del sistema.
          alta ? 'mt-[env(safe-area-inset-top,0px)] h-[88vh]' : 'max-h-[84vh]'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button
            onClick={onCerrar}
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-500 active:bg-slate-100"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  )
}

interface CampoProps {
  etiqueta: string
  valor: string
  onCambio: (v: string) => void
  tipo?: string
  placeholder?: string
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel'
  requerido?: boolean
}

export function Campo({
  etiqueta,
  valor,
  onCambio,
  tipo = 'text',
  placeholder,
  inputMode,
  requerido,
}: CampoProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">
        {etiqueta}
        {requerido && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={tipo}
        inputMode={inputMode}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onCambio(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-marca-500 focus:ring-2 focus:ring-marca-100"
      />
    </label>
  )
}

interface CampoNumeroProps {
  etiqueta: string
  valor: number
  onCambio: (n: number) => void
  placeholder?: string
  requerido?: boolean
  /** Cuántos decimales se admiten. 2 para plata, 3 para kilos (gramos). */
  decimales?: number
  prefijo?: string
  sufijo?: string
}

/**
 * Campo para importes y cantidades.
 *
 * Mientras se escribe conserva el texto tal cual y recién ahí lo convierte a
 * número. Si convirtiera en cada tecla, escribir "12," daría 12 y el separador
 * se borraría solo, haciendo imposible cargar decimales.
 *
 * Acepta coma y punto: el teclado en español trae coma, pero un lector de
 * códigos o un teclado físico puede mandar punto.
 */
export function CampoNumero({
  etiqueta,
  valor,
  onCambio,
  placeholder,
  requerido,
  decimales = 2,
  prefijo,
  sufijo,
}: CampoNumeroProps) {
  const [texto, setTexto] = useState(() => aTexto(valor))

  // Si el valor cambia desde afuera (se abrió otro producto), se refleja acá,
  // pero sin pisar lo que la persona está tecleando en este momento.
  useEffect(() => {
    if (aNumeroSuelto(texto) !== valor) setTexto(aTexto(valor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  const escribir = (bruto: string) => {
    let limpio = bruto.replace(/[^\d.,]/g, '').replace(/\./g, ',')

    // Un solo separador: los de más se descartan.
    const partes = limpio.split(',')
    if (partes.length > 2) limpio = `${partes[0]},${partes.slice(1).join('')}`

    const [entera, decimal] = limpio.split(',')
    if (decimales === 0) {
      limpio = entera
    } else if (decimal !== undefined && decimal.length > decimales) {
      limpio = `${entera},${decimal.slice(0, decimales)}`
    }

    setTexto(limpio)
    onCambio(aNumeroSuelto(limpio))
  }

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">
        {etiqueta}
        {requerido && <span className="text-red-500"> *</span>}
      </span>
      <div className="flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-marca-500 focus-within:ring-2 focus-within:ring-marca-100">
        {prefijo && <span className="pl-3 text-slate-500">{prefijo}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={texto}
          placeholder={placeholder}
          onChange={(e) => escribir(e.target.value)}
          className="w-full min-w-0 bg-transparent px-3 py-3 tabular-nums outline-none"
        />
        {sufijo && <span className="pr-3 whitespace-nowrap text-slate-500">{sufijo}</span>}
      </div>
    </label>
  )
}

/** 0 se muestra vacío: un "0" fijo obliga a borrarlo antes de escribir. */
function aTexto(n: number): string {
  return n ? String(n).replace('.', ',') : ''
}

function aNumeroSuelto(texto: string): number {
  const n = parseFloat(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Estado vacío con ícono y explicación, en vez de una pantalla en blanco. */
export function Vacio({ icono, texto }: { icono: string; texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="text-5xl opacity-40">{icono}</span>
      <p className="text-slate-500">{texto}</p>
    </div>
  )
}

/** Aviso corto que aparece arriba y se va solo. */
export function Aviso({ texto, onIr }: { texto: string; onIr?: () => void }) {
  useEffect(() => {
    if (!texto) return
    const t = setTimeout(() => onIr?.(), 2600)
    return () => clearTimeout(t)
  }, [texto, onIr])

  if (!texto) return null
  return (
    <div className="area-segura-arriba fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
      <div className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
        {texto}
      </div>
    </div>
  )
}

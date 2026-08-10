import { useCallback, useEffect, useState } from 'react'
import { CrearBoleta } from './componentes/CrearBoleta'
import { Aviso, Boton, Hoja } from './componentes/UI'
import type { Venta } from './db/db'
import { plata } from './lib/formato'
import { olvidarSesion, puede, sesionGuardada, type Sesion } from './lib/usuarios'
import { Ajustes } from './pantallas/Ajustes'
import { Boletas } from './pantallas/Boletas'
import { Entrar } from './pantallas/Entrar'
import { Productos } from './pantallas/Productos'
import { Vender } from './pantallas/Vender'

type Seccion = 'vender' | 'productos' | 'boletas' | 'ajustes'

const SECCIONES: { id: Seccion; etiqueta: string; icono: string; soloDueño?: boolean }[] = [
  { id: 'vender', etiqueta: 'Vender', icono: '🛒' },
  { id: 'productos', etiqueta: 'Productos', icono: '📦', soloDueño: true },
  { id: 'boletas', etiqueta: 'Boletas', icono: '🧾' },
  { id: 'ajustes', etiqueta: 'Ajustes', icono: '⚙️', soloDueño: true },
]

export default function App() {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [verificando, setVerificando] = useState(true)
  const [seccion, setSeccion] = useState<Seccion>('vender')
  const [aviso, setAviso] = useState('')
  /** Venta recién cobrada, en la pantalla de confirmación. */
  const [reciente, setReciente] = useState<Venta | null>(null)
  /** Venta para la que se está creando una boleta. */
  const [paraBoleta, setParaBoleta] = useState<Venta | null>(null)

  const mostrarAviso = useCallback((texto: string) => setAviso(texto), [])
  const limpiarAviso = useCallback(() => setAviso(''), [])

  useEffect(() => {
    void (async () => {
      const usuario = await sesionGuardada()
      if (usuario) setSesion({ usuario })
      setVerificando(false)
    })()
  }, [])

  if (verificando) return <div className="h-dvh bg-marca-700" />
  if (!sesion) return <Entrar onEntrar={setSesion} />

  const salir = () => {
    olvidarSesion()
    setSesion(null)
    setSeccion('vender')
  }

  const visibles = SECCIONES.filter((s) => !s.soloDueño || puede(sesion, 'configurarTienda'))

  return (
    <div className="area-segura-arriba area-segura-lados flex h-dvh flex-col overflow-hidden bg-marca-700">
      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-100">
        {seccion === 'vender' && (
          <Vender sesion={sesion} onVentaLista={setReciente} onAviso={mostrarAviso} />
        )}
        {seccion === 'productos' && <Productos sesion={sesion} onAviso={mostrarAviso} />}
        {seccion === 'boletas' && <Boletas onAviso={mostrarAviso} />}
        {seccion === 'ajustes' && (
          <Ajustes sesion={sesion} onAviso={mostrarAviso} onSalir={salir} />
        )}
      </main>

      <nav className="area-segura-abajo flex shrink-0 border-t border-slate-200 bg-white">
        {visibles.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${
              seccion === s.id ? 'text-marca-700' : 'text-slate-400'
            }`}
          >
            <span className="text-xl leading-none">{s.icono}</span>
            <span className="text-[11px] font-medium">{s.etiqueta}</span>
          </button>
        ))}
        {/* El cajero no tiene Ajustes, así que necesita otra forma de salir. */}
        {!puede(sesion, 'configurarTienda') && (
          <button
            onClick={salir}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-slate-400"
          >
            <span className="text-xl leading-none">🚪</span>
            <span className="text-[11px] font-medium">Salir</span>
          </button>
        )}
      </nav>

      <VentaLista
        venta={reciente}
        onCerrar={() => setReciente(null)}
        onCrearBoleta={() => {
          setParaBoleta(reciente)
          setReciente(null)
        }}
      />

      <CrearBoleta venta={paraBoleta} onCerrar={() => setParaBoleta(null)} onAviso={mostrarAviso} />

      <Aviso texto={aviso} onIr={limpiarAviso} />
    </div>
  )
}

/**
 * Confirmación posterior a la venta. La boleta no se genera acá: solo se
 * ofrece el botón, porque la mayoría de los clientes no pide comprobante.
 */
function VentaLista({
  venta,
  onCerrar,
  onCrearBoleta,
}: {
  venta: Venta | null
  onCerrar: () => void
  onCrearBoleta: () => void
}) {
  if (!venta) return null

  return (
    <Hoja abierta onCerrar={onCerrar} titulo="Venta registrada">
      <div className="space-y-4 p-4">
        <div className="rounded-xl bg-marca-50 px-4 py-6 text-center">
          <div className="text-5xl">✅</div>
          <div className="mt-3 text-3xl font-bold tabular-nums text-marca-800">
            {plata(venta.total)}
          </div>
          {venta.vuelto !== undefined && venta.vuelto > 0 && (
            <div className="mt-2 text-lg font-semibold text-slate-700">
              Vuelto: {plata(venta.vuelto)}
            </div>
          )}
        </div>

        <Boton onClick={onCrearBoleta} tipo="secundario" className="w-full text-lg">
          🧾 Crear boleta
        </Boton>

        <Boton onClick={onCerrar} className="w-full text-lg">
          Siguiente cliente
        </Boton>
      </div>
    </Hoja>
  )
}

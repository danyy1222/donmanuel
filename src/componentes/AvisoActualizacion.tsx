import { useEffect, useState } from 'react'
import {
  buscarActualizacion,
  posponer,
  silenciarUnRato,
  VERSION_APP,
  type Actualizacion,
} from '../lib/actualizaciones'
import { Boton, Hoja } from './UI'

/**
 * Avisa cuando hay una versión más nueva publicada.
 *
 * La revisión se hace al abrir la app y no mientras se vende: un cartel
 * apareciendo en medio de un cobro sería peor que no avisar nada.
 */
export function AvisoActualizacion({ activo }: { activo: boolean }) {
  const [nueva, setNueva] = useState<Actualizacion | null>(null)

  useEffect(() => {
    if (!activo) return
    // Se espera un momento a que la app termine de abrir: el aviso no tiene
    // ninguna urgencia y competir con el arranque se nota.
    const t = setTimeout(() => {
      void buscarActualizacion().then(setNueva)
    }, 4000)
    return () => clearTimeout(t)
  }, [activo])

  if (!nueva) return null

  const cerrar = () => {
    posponer(nueva.version)
    setNueva(null)
  }

  return (
    <Hoja abierta onCerrar={cerrar} titulo="Hay una versión nueva">
      <div className="space-y-4 p-4">
        <div className="rounded-xl bg-marca-50 px-4 py-5 text-center">
          <div className="text-4xl">🎉</div>
          <div className="mt-2 text-sm text-slate-500">
            Tienes la {VERSION_APP} · sale la {nueva.version}
          </div>
        </div>

        {nueva.novedades && (
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-slate-700">
            {nueva.novedades}
          </p>
        )}

        <Boton
          onClick={() => {
            window.open(nueva.descarga, '_blank')
            // No se da por instalada: si la descarga se corta o la instalación
            // se cancela, en unas horas vuelve a avisar.
            silenciarUnRato()
            setNueva(null)
          }}
          className="w-full text-lg"
        >
          ⬇ Descargar
        </Boton>

        <Boton tipo="secundario" onClick={cerrar} className="w-full">
          Después
        </Boton>

        <p className="px-2 text-center text-xs text-slate-500">
          Se instala encima de la actual. No se pierden productos, ventas ni boletas.
        </p>
      </div>
    </Hoja>
  )
}

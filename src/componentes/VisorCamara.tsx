import { useEffect, useRef, useState } from 'react'
import { iniciarEscaneo, type Escaneo } from '../lib/escaner'

interface Props {
  /** Se llama con cada código leído, ya filtrado de repeticiones. */
  onCodigo: (codigo: string) => void
  /** Se pausa la lectura mientras hay un diálogo abierto encima. */
  pausado: boolean
  /**
   * Oculta el visor sin apagar la cámara. Se usa al pasar a la vista de
   * productos sin código: reabrir la cámara tarda casi un segundo y en el
   * mostrador se alterna entre las dos vistas todo el tiempo.
   */
  oculto?: boolean
  /** Avisa si la cámara no se pudo abrir, para poder ofrecer otra vía. */
  onSinCamara: (motivo: string) => void
}

/**
 * Cámara siempre encendida arriba de la pantalla de venta. No es un diálogo:
 * la idea es abrir la app y ya estar escaneando, sin tocar nada.
 */
export function VisorCamara({ onCodigo, pausado, oculto, onSinCamara }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const escaneo = useRef<Escaneo | null>(null)
  const [estado, setEstado] = useState<'abriendo' | 'listo' | 'error'>('abriendo')
  const [ultimo, setUltimo] = useState('')
  /** Cambiarlo reintenta la apertura: sirve si otra app tenía la cámara tomada. */
  const [intento, setIntento] = useState(0)

  // El callback se guarda en una ref para que cambiar de manejador no reinicie
  // la cámara: reabrirla tarda casi un segundo y se ve el parpadeo.
  const alCodigo = useRef(onCodigo)
  alCodigo.current = onCodigo
  const alFallar = useRef(onSinCamara)
  alFallar.current = onSinCamara

  useEffect(() => {
    if (!video.current) return
    let vivo = true

    iniciarEscaneo(video.current, (codigo) => {
      navigator.vibrate?.(60)
      setUltimo(codigo)
      alCodigo.current(codigo)
    })
      .then((e) => {
        if (!vivo) {
          e.detener()
          return
        }
        escaneo.current = e
        setEstado('listo')
      })
      .catch((e: unknown) => {
        if (!vivo) return
        setEstado('error')
        alFallar.current(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Sin permiso para la cámara'
            : 'No se pudo abrir la cámara',
        )
      })

    return () => {
      vivo = false
      escaneo.current?.detener()
      escaneo.current = null
    }
  }, [intento])

  useEffect(() => {
    if (pausado) escaneo.current?.pausar()
    else escaneo.current?.reanudar()
  }, [pausado])

  // El destello verde confirma la lectura sin tener que mirar la lista.
  useEffect(() => {
    if (!ultimo) return
    const t = setTimeout(() => setUltimo(''), 400)
    return () => clearTimeout(t)
  }, [ultimo])

  if (estado === 'error') {
    // El <video> se mantiene en el árbol aunque no se use: quitarlo dejaría la
    // ref en null y un reintento posterior no tendría dónde dibujar.
    return (
      <div className={oculto ? 'hidden' : ''}>
        <video ref={video} className="hidden" muted playsInline />
        <div className="flex h-40 flex-col items-center justify-center gap-3 bg-slate-800 px-6 text-center">
          <span className="text-3xl">📷</span>
          <p className="text-sm text-slate-300">
            No se puede usar la cámara. Cargá los productos desde la lista.
          </p>
          <button
            onClick={() => {
              setEstado('abriendo')
              setIntento((n) => n + 1)
            }}
            className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white active:bg-white/25"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative shrink-0 overflow-hidden bg-black ${oculto ? 'hidden' : ''}`}>
      <video ref={video} className="h-44 w-full object-cover" muted playsInline />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`h-20 w-4/5 rounded-lg border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-colors ${
            ultimo ? 'border-marca-400 bg-marca-400/25' : 'border-white/70'
          }`}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center">
        <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
          {estado === 'abriendo'
            ? 'Abriendo la cámara...'
            : pausado
              ? 'Escaneo en pausa'
              : 'Apuntá al código de barras'}
        </span>
      </div>
    </div>
  )
}

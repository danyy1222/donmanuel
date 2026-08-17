import { useEffect, useState } from 'react'
import { Boton, Campo, CintaPruebas } from '../componentes/UI'
import { Teclado } from '../componentes/Teclado'
import type { Usuario } from '../db/db'
import {
  crearUsuario,
  hayUsuarios,
  recordarSesion,
  usuariosActivos,
  verificarPin,
  type Sesion,
} from '../lib/usuarios'

const LARGO_PIN = 4

export function Entrar({ onEntrar }: { onEntrar: (s: Sesion) => void }) {
  const [cargando, setCargando] = useState(true)
  const [primerUso, setPrimerUso] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [elegido, setElegido] = useState<Usuario | null>(null)

  useEffect(() => {
    void (async () => {
      if (!(await hayUsuarios())) {
        setPrimerUso(true)
      } else {
        const lista = await usuariosActivos()
        setUsuarios(lista)
        // Con un solo usuario no tiene sentido hacer elegir: se va derecho al PIN.
        if (lista.length === 1) setElegido(lista[0])
      }
      setCargando(false)
    })()
  }, [])

  if (cargando) {
    return <div className="flex h-dvh items-center justify-center bg-marca-700" />
  }

  if (primerUso) {
    return <PrimerUso onListo={onEntrar} />
  }

  if (elegido) {
    return (
      <PedirPin
        usuario={elegido}
        onVolver={usuarios.length > 1 ? () => setElegido(null) : undefined}
        onEntrar={onEntrar}
      />
    )
  }

  return (
    <Marco titulo="¿Quién está en la caja?">
      <div className="space-y-2">
        {usuarios.map((u) => (
          <button
            key={u.id}
            onClick={() => setElegido(u)}
            className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-4 text-left active:bg-slate-100"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-marca-100 text-lg font-bold text-marca-700">
              {u.nombre.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{u.nombre}</div>
              <div className="text-xs text-slate-500 capitalize">{u.rol}</div>
            </div>
          </button>
        ))}
      </div>
    </Marco>
  )
}

function PedirPin({
  usuario,
  onVolver,
  onEntrar,
}: {
  usuario: Usuario
  onVolver?: () => void
  onEntrar: (s: Sesion) => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  // Se valida solo al completar los 4 dígitos: no hace falta botón de confirmar.
  useEffect(() => {
    if (pin.length !== LARGO_PIN) return
    void (async () => {
      if (await verificarPin(usuario, pin)) {
        recordarSesion(usuario.id!)
        onEntrar({ usuario })
      } else {
        setError(true)
        navigator.vibrate?.([80, 60, 80])
        setTimeout(() => {
          setPin('')
          setError(false)
        }, 700)
      }
    })()
  }, [pin, usuario, onEntrar])

  return (
    <Marco titulo={`Hola, ${usuario.nombre}`} subtitulo="Pon tu PIN para entrar">
      <div className="mb-6 flex justify-center gap-3">
        {Array.from({ length: LARGO_PIN }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full transition-colors ${
              error ? 'bg-red-400' : i < pin.length ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {error && <p className="mb-4 text-center font-medium text-red-200">PIN incorrecto</p>}

      <div className="rounded-2xl bg-white p-3">
        <Teclado
          conComa={false}
          onTecla={(t) => setPin((p) => (p.length < LARGO_PIN ? p + t : p))}
          onBorrar={() => setPin((p) => p.slice(0, -1))}
        />
      </div>

      {onVolver && (
        <button
          onClick={onVolver}
          className="mt-4 w-full py-3 text-center text-sm font-medium text-white/80"
        >
          Cambiar de usuario
        </button>
      )}
    </Marco>
  )
}

function PrimerUso({ onListo }: { onListo: (s: Sesion) => void }) {
  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')

  const crear = async () => {
    if (nombre.trim().length < 2) return setError('Escribe tu nombre')
    if (pin.length !== LARGO_PIN) return setError(`El PIN tiene que ser de ${LARGO_PIN} números`)
    if (pin !== repetir) return setError('Los dos PIN no coinciden')

    const id = await crearUsuario(nombre, pin, 'dueño')
    const usuario = { id, nombre: nombre.trim(), pinHash: '', sal: '', rol: 'dueño' as const, activo: 1, creado: new Date() }
    recordarSesion(id)
    onListo({ usuario })
  }

  return (
    <Marco titulo="Bienvenido" subtitulo="Crea tu usuario de dueño para empezar">
      <div className="space-y-4 rounded-2xl bg-white p-4">
        <Campo etiqueta="Tu nombre" valor={nombre} onCambio={setNombre} placeholder="Juan" requerido />
        <Campo
          etiqueta={`PIN de ${LARGO_PIN} números`}
          valor={pin}
          onCambio={(v) => setPin(v.replace(/\D/g, '').slice(0, LARGO_PIN))}
          tipo="password"
          inputMode="numeric"
          requerido
        />
        <Campo
          etiqueta="Repite el PIN"
          valor={repetir}
          onCambio={(v) => setRepetir(v.replace(/\D/g, '').slice(0, LARGO_PIN))}
          tipo="password"
          inputMode="numeric"
          requerido
        />

        {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}

        <Boton onClick={crear} className="w-full text-lg">
          Empezar
        </Boton>

        <p className="text-center text-xs text-slate-500">
          Como dueño vas a ver los costos, las ganancias y la configuración. Después puedes crear
          usuarios de cajero, que solo pueden vender.
        </p>
      </div>
    </Marco>
  )
}

function Marco({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string
  subtitulo?: string
  children: React.ReactNode
}) {
  return (
    <div className="area-segura-arriba area-segura-abajo area-segura-lados flex h-dvh flex-col overflow-y-auto bg-marca-700">
      <CintaPruebas />
      <div className="mx-auto my-auto w-full max-w-sm px-6 py-8">
        <h1 className="mb-1 text-center text-2xl font-bold text-white">{titulo}</h1>
        {subtitulo && <p className="mb-6 text-center text-white/80">{subtitulo}</p>}
        {!subtitulo && <div className="mb-6" />}
        {children}
      </div>
    </div>
  )
}

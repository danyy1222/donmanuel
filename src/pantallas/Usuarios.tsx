import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Boton, Campo, Hoja } from '../componentes/UI'
import { db, type Rol, type Usuario } from '../db/db'
import { fechaCorta } from '../lib/formato'
import { cambiarPin, crearUsuario, esUltimoDueño, type Sesion } from '../lib/usuarios'

const LARGO_PIN = 4

interface Props {
  sesion: Sesion
  onAviso: (t: string) => void
}

export function Usuarios({ sesion, onAviso }: Props) {
  const [editando, setEditando] = useState<Usuario | 'nuevo' | null>(null)
  const usuarios = useLiveQuery(() => db.usuarios.where('activo').equals(1).toArray(), [], [])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-bold">Usuarios</h2>
        <button
          onClick={() => setEditando('nuevo')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-marca-600 text-xl text-white active:bg-marca-700"
          aria-label="Nuevo usuario"
        >
          +
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        El <strong>dueño</strong> ve todo. El <strong>cajero</strong> solo puede vender: no ve
        costos, ganancias ni configuración.
      </p>

      <div className="divide-y divide-slate-100">
        {usuarios.map((u) => (
          <button
            key={u.id}
            onClick={() => setEditando(u)}
            className="flex w-full items-center gap-3 py-3 text-left active:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-100 font-bold text-marca-700">
              {u.nombre.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {u.nombre}
                {u.id === sesion.usuario.id && (
                  <span className="ml-2 text-xs font-normal text-slate-400">(tú)</span>
                )}
              </div>
              <div className="text-xs text-slate-500 capitalize">
                {u.rol} · desde {fechaCorta(u.creado)}
              </div>
            </div>
          </button>
        ))}
      </div>

      <EditorUsuario
        key={editando === 'nuevo' ? 'nuevo' : (editando?.id ?? 'ninguno')}
        objetivo={editando}
        sesion={sesion}
        onCerrar={() => setEditando(null)}
        onAviso={onAviso}
      />
    </section>
  )
}

function EditorUsuario({
  objetivo,
  sesion,
  onCerrar,
  onAviso,
}: {
  objetivo: Usuario | 'nuevo' | null
  sesion: Sesion
  onCerrar: () => void
  onAviso: (t: string) => void
}) {
  const esNuevo = objetivo === 'nuevo'
  const usuario = esNuevo ? null : objetivo

  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'cajero')
  const [pin, setPin] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')

  if (!objetivo) return null

  const soloDigitos = (v: string) => v.replace(/\D/g, '').slice(0, LARGO_PIN)

  const guardar = async () => {
    if (nombre.trim().length < 2) return setError('Pon un nombre')

    // En un usuario nuevo el PIN es obligatorio; al editar, solo si se quiere cambiar.
    if (esNuevo || pin) {
      if (pin.length !== LARGO_PIN) return setError(`El PIN tiene que ser de ${LARGO_PIN} números`)
      if (pin !== repetir) return setError('Los dos PIN no coinciden')
    }

    if (esNuevo) {
      await crearUsuario(nombre, pin, rol)
      onAviso(`${nombre.trim()} agregado como ${rol}`)
    } else {
      const id = usuario!.id!
      // Bajar de rol al último dueño dejaría el sistema sin nadie que pueda
      // entrar a la configuración.
      if (usuario!.rol === 'dueño' && rol !== 'dueño' && (await esUltimoDueño(id))) {
        return setError('Es el único dueño. Crea otro dueño antes de cambiarle el rol.')
      }
      await db.usuarios.update(id, { nombre: nombre.trim(), rol })
      if (pin) await cambiarPin(id, pin)
      onAviso('Usuario guardado')
    }
    onCerrar()
  }

  const darDeBaja = async () => {
    const id = usuario!.id!
    if (id === sesion.usuario.id) return setError('No puedes darte de baja a ti mismo')
    if (await esUltimoDueño(id)) return setError('Es el único dueño, no se puede dar de baja')
    await db.usuarios.update(id, { activo: 0 })
    onAviso(`${usuario!.nombre} dado de baja`)
    onCerrar()
  }

  return (
    <Hoja abierta onCerrar={onCerrar} titulo={esNuevo ? 'Nuevo usuario' : 'Editar usuario'} alta>
      <div className="space-y-4 p-4">
        <Campo etiqueta="Nombre" valor={nombre} onCambio={setNombre} requerido />

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-600">Rol</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['cajero', 'Cajero', 'Solo vende'],
                ['dueño', 'Dueño', 'Ve y hace todo'],
              ] as [Rol, string, string][]
            ).map(([id, titulo, ayuda]) => (
              <button
                key={id}
                onClick={() => setRol(id)}
                className={`rounded-xl border-2 px-3 py-3 text-left ${
                  rol === id ? 'border-marca-600 bg-marca-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="font-semibold">{titulo}</div>
                <div className="text-xs text-slate-500">{ayuda}</div>
              </button>
            ))}
          </div>
        </div>

        <Campo
          etiqueta={esNuevo ? `PIN de ${LARGO_PIN} números` : 'Nuevo PIN (dejar vacío para no cambiarlo)'}
          valor={pin}
          onCambio={(v) => setPin(soloDigitos(v))}
          tipo="password"
          inputMode="numeric"
          requerido={esNuevo}
        />
        {(esNuevo || pin) && (
          <Campo
            etiqueta="Repite el PIN"
            valor={repetir}
            onCambio={(v) => setRepetir(soloDigitos(v))}
            tipo="password"
            inputMode="numeric"
          />
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <Boton onClick={guardar} className="w-full text-lg">
          Guardar
        </Boton>

        {!esNuevo && usuario!.id !== sesion.usuario.id && (
          <Boton tipo="fantasma" onClick={darDeBaja} className="w-full text-red-600">
            Dar de baja
          </Boton>
        )}
      </div>
    </Hoja>
  )
}

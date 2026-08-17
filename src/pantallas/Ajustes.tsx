import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Boton, Campo } from '../componentes/UI'
import { db, guardarConfig, leerConfig } from '../db/db'
import {
  buscarActualizacion,
  VERSION_APP,
  type Actualizacion,
} from '../lib/actualizaciones'
import { fechaCorta, plata } from '../lib/formato'
import type { Sesion } from '../lib/usuarios'
import { Usuarios } from './Usuarios'

interface Props {
  sesion: Sesion
  onAviso: (t: string) => void
  onSalir: () => void
}

export function Ajustes({ sesion, onAviso, onSalir }: Props) {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')

  useEffect(() => {
    void (async () => {
      setNombre(await leerConfig('tiendaNombre', 'Mi Tienda'))
      setDireccion(await leerConfig('tiendaDireccion'))
      setTelefono(await leerConfig('tiendaTelefono'))
    })()
  }, [])

  const boletas = useLiveQuery(() => db.boletas.count(), [], 0)
  const productos = useLiveQuery(() => db.productos.where('activo').equals(1).count(), [], 0)

  // Se consulta por el índice de fecha en vez de traer el historial entero:
  // con miles de ventas acumuladas, cargarlas todas para sumar las de hoy
  // trababa la pantalla cada vez que se abría.
  const hoy = useLiveQuery(
    async () => {
      const desde = new Date()
      desde.setHours(0, 0, 0, 0)
      const delDia = await db.ventas.where('fecha').aboveOrEqual(desde).toArray()
      const cerradas = delDia.filter((v) => v.estado === 'completada')
      return { cantidad: cerradas.length, total: cerradas.reduce((s, v) => s + v.total, 0) }
    },
    [],
    { cantidad: 0, total: 0 },
  )

  const ultimas = useLiveQuery(
    () => db.ventas.orderBy('fecha').reverse().limit(10).toArray(),
    [],
    [],
  )

  const guardar = async () => {
    await guardarConfig('tiendaNombre', nombre.trim())
    await guardarConfig('tiendaDireccion', direccion.trim())
    await guardarConfig('tiendaTelefono', telefono.trim())
    onAviso('Datos guardados')
  }

  return (
    <div className="space-y-5 p-4">
      <section className="grid grid-cols-3 gap-2">
        <Tarjeta titulo="Vendido hoy" valor={plata(hoy.total)} />
        <Tarjeta titulo="Ventas hoy" valor={String(hoy.cantidad)} />
        <Tarjeta titulo="Boletas" valor={String(boletas)} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 font-bold">Datos de la tienda</h2>
        <p className="mb-4 text-sm text-slate-500">
          Aparecen en el encabezado de todas las boletas que generes.
        </p>
        <div className="space-y-3">
          <Campo etiqueta="Nombre" valor={nombre} onCambio={setNombre} placeholder="Verdulería Don Juan" />
          <Campo etiqueta="Dirección" valor={direccion} onCambio={setDireccion} placeholder="Av. Siempre Viva 742" />
          <Campo
            etiqueta="Teléfono"
            valor={telefono}
            onCambio={setTelefono}
            tipo="tel"
            inputMode="tel"
            placeholder="11 2233-4455"
          />
          <Boton onClick={guardar} className="w-full">
            Guardar datos
          </Boton>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 font-bold">Respaldo</h2>
        <p className="mb-4 text-sm text-slate-500">
          Los datos viven dentro de este celular. Si se pierde o se formatea sin respaldo, se pierde
          todo. Guarda una copia seguido.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Boton tipo="secundario" onClick={() => exportar(onAviso)}>
            ⬇ Exportar
          </Boton>
          <label className="flex h-[52px] cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 active:bg-slate-100">
            ⬆ Importar
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0]
                if (archivo) void importar(archivo, onAviso)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>

      <Usuarios sesion={sesion} onAviso={onAviso} />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Últimas ventas</h2>
        {ultimas.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay ventas.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ultimas.map((v) => (
              <div key={v.id} className="flex justify-between py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-500">
                  {fechaCorta(v.fecha)} · {v.items.length} art.
                  {v.usuarioNombre && ` · ${v.usuarioNombre}`}
                </span>
                <span className="ml-2 font-semibold tabular-nums">{plata(v.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <RevisarActualizacion onAviso={onAviso} />

      <Boton tipo="secundario" onClick={onSalir} className="w-full">
        🚪 Salir ({sesion.usuario.nombre})
      </Boton>

      <p className="pb-4 text-center text-xs text-slate-400">
        {productos} productos activos · Tienda Don Manuel v{VERSION_APP}
      </p>
    </div>
  )
}

/**
 * Revisión manual, además de la automática al abrir la app. Sirve cuando se
 * sabe que salió algo nuevo y no se quiere esperar a la próxima revisión.
 */
function RevisarActualizacion({ onAviso }: { onAviso: (t: string) => void }) {
  const [buscando, setBuscando] = useState(false)
  const [encontrada, setEncontrada] = useState<Actualizacion | null>(null)

  const revisar = async () => {
    setBuscando(true)
    // Se fuerza para saltear el límite de una vez por hora y el "Después".
    const r = await buscarActualizacion(true)
    setBuscando(false)
    if (r) setEncontrada(r)
    else onAviso('Ya tenés la última versión')
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 font-bold">Actualizaciones</h2>
      <p className="mb-4 text-sm text-slate-500">
        La app revisa sola al abrirse. Acá podés revisar cuando quieras.
      </p>

      {encontrada ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-marca-50 px-4 py-3 text-center text-sm text-marca-800">
            Sale la <strong>{encontrada.version}</strong>. {encontrada.novedades}
          </p>
          <Boton onClick={() => window.open(encontrada.descarga, '_blank')} className="w-full">
            ⬇ Descargar
          </Boton>
        </div>
      ) : (
        <Boton tipo="secundario" onClick={revisar} disabled={buscando} className="w-full">
          {buscando ? 'Revisando...' : '🔄 Buscar actualización'}
        </Boton>
      )}
    </section>
  )
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-3 text-center">
      <div className="truncate text-lg font-bold tabular-nums">{valor}</div>
      <div className="text-[11px] text-slate-500">{titulo}</div>
    </div>
  )
}

/**
 * Exporta todo a un JSON. Las fotos y los PDF quedan afuera a propósito: son
 * lo único pesado y ambos se pueden reconstruir —los PDF desde los datos de la
 * boleta, que no cambian nunca; las fotos hay que volver a sacarlas—.
 */
async function exportar(onAviso: (t: string) => void): Promise<void> {
  const datos = {
    version: 2,
    fecha: new Date().toISOString(),
    categorias: await db.categorias.toArray(),
    productos: await db.productos.toArray(),
    ventas: await db.ventas.toArray(),
    boletas: await db.boletas.toArray(),
    usuarios: await db.usuarios.toArray(),
    config: await db.config.toArray(),
  }

  const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `respaldo-tienda-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  onAviso('Respaldo descargado')
}

async function importar(archivo: File, onAviso: (t: string) => void): Promise<void> {
  if (!confirm('Esto reemplaza TODOS los datos actuales por los del respaldo. ¿Seguir?')) return

  try {
    const datos = JSON.parse(await archivo.text())
    await db.transaction(
      'rw',
      [db.categorias, db.productos, db.ventas, db.boletas, db.usuarios, db.fotos, db.pdfs, db.config],
      async () => {
        await Promise.all([
          db.categorias.clear(),
          db.productos.clear(),
          db.ventas.clear(),
          db.boletas.clear(),
          db.usuarios.clear(),
          // Fotos y PDF no vienen en el respaldo: si quedaran los viejos,
          // apuntarían a productos y boletas que ya no son los mismos.
          db.fotos.clear(),
          db.pdfs.clear(),
          db.config.clear(),
        ])
        await db.categorias.bulkAdd(datos.categorias ?? [])
        await db.productos.bulkAdd(
          (datos.productos ?? []).map((p: { tieneFoto?: number }) => ({ ...p, tieneFoto: 0 })),
        )
        // Las fechas viajan como texto en el JSON y hay que devolverlas a Date.
        await db.ventas.bulkAdd(
          (datos.ventas ?? []).map((v: { fecha: string }) => ({ ...v, fecha: new Date(v.fecha) })),
        )
        await db.boletas.bulkAdd(
          (datos.boletas ?? []).map((b: { fecha: string; fechaEnvio?: string }) => ({
            ...b,
            fecha: new Date(b.fecha),
            fechaEnvio: b.fechaEnvio ? new Date(b.fechaEnvio) : undefined,
            // Se regenera al abrirla, desde los datos que sí se restauraron.
            tienePdf: 0,
          })),
        )
        await db.usuarios.bulkAdd(
          (datos.usuarios ?? []).map((u: { creado: string }) => ({
            ...u,
            creado: new Date(u.creado),
          })),
        )
        await db.config.bulkAdd(datos.config ?? [])
      },
    )
    onAviso('Respaldo restaurado')
    setTimeout(() => location.reload(), 1200)
  } catch {
    onAviso('El archivo no es un respaldo válido')
  }
}

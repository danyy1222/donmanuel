import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Boton, Campo } from '../componentes/UI'
import {
  borrarImagen,
  db,
  guardarConfig,
  guardarImagen,
  leerConfig,
  leerImagen,
} from '../db/db'
import { achicarQr } from '../lib/imagen'
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

  const productos = useLiveQuery(() => db.productos.where('activo').equals(1).count(), [], 0)

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

      <CobrosDigitales onAviso={onAviso} />

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

      <VaciarCatalogo onAviso={onAviso} />

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
 * Los datos para cobrar por Yape y Plin.
 *
 * Se guarda el QR personal, que es la forma que no cobra comisión. Como es fijo
 * y no lleva el importe adentro, en el cobro se muestra el monto al lado para
 * que el cliente lo escriba.
 */
function CobrosDigitales({ onAviso }: { onAviso: (t: string) => void }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 font-bold">Cobros por Yape y Plin</h2>
      <p className="mb-4 text-sm text-slate-500">
        Cargá tu QR de cada uno y aparece en la pantalla de cobro para que el cliente lo escanee.
        Sacalo de la app: Menú → Mi QR → Descargar.
      </p>
      <div className="space-y-4">
        <QrCobro metodo="yape" etiqueta="Yape" onAviso={onAviso} />
        <QrCobro metodo="plin" etiqueta="Plin" onAviso={onAviso} />
      </div>
    </section>
  )
}

function QrCobro({
  metodo,
  etiqueta,
  onAviso,
}: {
  metodo: 'yape' | 'plin'
  etiqueta: string
  onAviso: (t: string) => void
}) {
  const [numero, setNumero] = useState('')
  const [qr, setQr] = useState<string | null>(null)
  /** La URL viva del blob. Va en un ref para poder soltarla al desmontar. */
  const url = useRef<string | null>(null)

  const clave = `qr-${metodo}`
  const claveNumero = `${metodo}Numero`

  const mostrar = (blob: Blob | undefined) => {
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = blob ? URL.createObjectURL(blob) : null
    setQr(url.current)
  }

  useEffect(() => {
    void (async () => {
      setNumero(await leerConfig(claveNumero))
      mostrar(await leerImagen(clave))
    })()
    return () => {
      if (url.current) URL.revokeObjectURL(url.current)
      url.current = null
    }
  }, [clave, claveNumero])

  const cargar = async (archivo: File) => {
    const blob = await achicarQr(archivo)
    await guardarImagen(clave, blob)
    mostrar(blob)
    onAviso(`QR de ${etiqueta} guardado`)
  }

  const quitar = async () => {
    await borrarImagen(clave)
    mostrar(undefined)
    onAviso(`QR de ${etiqueta} borrado`)
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start gap-3">
        {qr ? (
          <img src={qr} alt={`QR de ${etiqueta}`} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-3xl">
            {metodo === 'yape' ? '🟣' : '🔵'}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <Campo
            etiqueta={`Número de ${etiqueta}`}
            valor={numero}
            onCambio={(v) => {
              setNumero(v)
              void guardarConfig(claveNumero, v.trim())
            }}
            tipo="tel"
            inputMode="tel"
            placeholder="987 654 321"
          />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 active:bg-slate-100">
          {qr ? 'Cambiar QR' : 'Cargar QR'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) void cargar(archivo)
              e.target.value = ''
            }}
          />
        </label>
        <button
          onClick={quitar}
          disabled={!qr}
          className="h-11 rounded-xl text-sm font-semibold text-red-600 active:bg-red-50 disabled:text-slate-300"
        >
          Quitar QR
        </button>
      </div>
    </div>
  )
}

/**
 * Borra todos los productos de una vez.
 *
 * La app viene con decenas de productos de ejemplo, y al empezar a cargar los
 * de la tienda darlos de baja uno por uno es media hora de trabajo.
 *
 * Las ventas ya hechas no se tocan: cada línea de venta guarda copiado el
 * nombre y el precio del producto, así que el historial y las boletas siguen
 * mostrando lo que se cobró.
 */
function VaciarCatalogo({ onAviso }: { onAviso: (t: string) => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const cuantos = useLiveQuery(() => db.productos.count(), [], 0)

  const vaciar = async () => {
    await db.transaction('rw', db.productos, db.fotos, async () => {
      await db.fotos.clear()
      await db.productos.clear()
    })
    onAviso(`${cuantos} productos borrados`)
    setConfirmando(false)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 font-bold">Vaciar el catálogo</h2>
      <p className="mb-4 text-sm text-slate-500">
        Borra los {cuantos} productos cargados, para empezar con los tuyos. Las categorías, las
        ventas y las boletas no se tocan.
      </p>

      {confirmando ? (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            Se borran los {cuantos} productos y sus fotos. Esto no se puede deshacer.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Boton tipo="secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </Boton>
            <Boton tipo="peligro" onClick={vaciar}>
              Borrar todo
            </Boton>
          </div>
        </div>
      ) : (
        <Boton
          tipo="secundario"
          onClick={() => setConfirmando(true)}
          disabled={cuantos === 0}
          className="w-full"
        >
          🗑 Borrar todos los productos
        </Boton>
      )}
    </section>
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
    else onAviso('Ya tienes la última versión')
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 font-bold">Actualizaciones</h2>
      <p className="mb-4 text-sm text-slate-500">
        La app revisa sola al abrirse. Acá puedes revisar cuando quieras.
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

/**
 * Exporta todo a un JSON. Las fotos y los PDF quedan afuera a propósito: son
 * lo único pesado y ambos se pueden reconstruir —los PDF desde los datos de la
 * boleta, que no cambian nunca; las fotos hay que volver a sacarlas—.
 */
async function exportar(onAviso: (t: string) => void): Promise<void> {
  const datos = {
    version: 3,
    fecha: new Date().toISOString(),
    categorias: await db.categorias.toArray(),
    productos: await db.productos.toArray(),
    ventas: await db.ventas.toArray(),
    boletas: await db.boletas.toArray(),
    usuarios: await db.usuarios.toArray(),
    movStock: await db.movStock.toArray(),
    caja: await db.caja.toArray(),
    movCaja: await db.movCaja.toArray(),
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
      [
        db.categorias,
        db.productos,
        db.ventas,
        db.boletas,
        db.usuarios,
        db.fotos,
        db.pdfs,
        db.movStock,
        db.caja,
        db.movCaja,
        db.config,
      ],
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
          db.movStock.clear(),
          db.caja.clear(),
          db.movCaja.clear(),
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
        // Respaldos de la versión 2 no traen stock ni caja: se restauran vacíos
        // y el historial arranca de nuevo, sin romper nada de lo demás.
        await db.movStock.bulkAdd(
          (datos.movStock ?? []).map((m: { fecha: string }) => ({ ...m, fecha: new Date(m.fecha) })),
        )
        await db.caja.bulkAdd(
          (datos.caja ?? []).map((c: { abierta: string; cerrada?: string }) => ({
            ...c,
            abierta: new Date(c.abierta),
            cerrada: c.cerrada ? new Date(c.cerrada) : undefined,
          })),
        )
        await db.movCaja.bulkAdd(
          (datos.movCaja ?? []).map((m: { fecha: string }) => ({ ...m, fecha: new Date(m.fecha) })),
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

import { useEffect, useState } from 'react'
import {
  db,
  guardarPdf,
  leerConfig,
  leerPdf,
  proximoNumeroBoleta,
  type Boleta,
  type Venta,
} from '../db/db'
import { generarBoletaPdf, type DatosTienda } from '../lib/boletaPdf'
import { descargarPdf, enviarPorWhatsapp, verPdf } from '../lib/compartir'
import { plata } from '../lib/formato'
import { Boton, Campo, Hoja } from './UI'

interface Props {
  /** Venta de la que sale la boleta. */
  venta: Venta | null
  onCerrar: () => void
  onAviso: (texto: string) => void
}

/**
 * Formulario de creación de boleta. Solo se abre cuando alguien pide el
 * comprobante: las ventas comunes se guardan sin generar ningún PDF.
 */
export function CrearBoleta({ venta, onCerrar, onAviso }: Props) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [doc, setDoc] = useState('')
  const [direccion, setDireccion] = useState('')
  const [formato, setFormato] = useState<'ticket' | 'a4'>('ticket')
  const [creada, setCreada] = useState<Boleta | null>(null)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    if (venta) {
      setNombre('')
      setTelefono('')
      setDoc('')
      setDireccion('')
      setFormato('ticket')
      setCreada(null)
    }
  }, [venta])

  if (!venta) return null

  const generar = async () => {
    setGenerando(true)
    try {
      const numero = await proximoNumeroBoleta()
      const boleta: Boleta = {
        numero,
        ventaId: venta.id,
        fecha: new Date(),
        clienteNombre: nombre.trim(),
        clienteTelefono: telefono.trim(),
        clienteDoc: doc.trim() || undefined,
        clienteDireccion: direccion.trim() || undefined,
        items: venta.items.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          tipoVenta: i.tipoVenta,
          precioUnit: i.precioUnit,
          subtotal: i.subtotal,
        })),
        subtotal: venta.subtotal,
        descuento: venta.descuento,
        total: venta.total,
        metodoPago: venta.metodoPago,
        formato,
        enviada: 0,
      }

      const pdf = await generarBoletaPdf(boleta, await datosTienda())
      boleta.tienePdf = 1
      boleta.id = await db.boletas.add(boleta)
      await guardarPdf(boleta.id, pdf)
      setCreada(boleta)
    } catch {
      onAviso('No se pudo generar la boleta')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Hoja abierta onCerrar={onCerrar} titulo={creada ? `Boleta ${creada.numero}` : 'Crear boleta'} alta>
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
          <div className="text-sm text-slate-500">
            {venta.items.length} producto{venta.items.length === 1 ? '' : 's'}
          </div>
          <div className="text-2xl font-bold tabular-nums">{plata(venta.total)}</div>
        </div>

        {creada ? (
          <AccionesBoleta boleta={creada} onAviso={onAviso} onListo={onCerrar} />
        ) : (
          <>
            <Campo etiqueta="Nombre del cliente" valor={nombre} onCambio={setNombre} placeholder="Opcional" />
            <Campo
              etiqueta="Teléfono (para mandar por WhatsApp)"
              valor={telefono}
              onCambio={setTelefono}
              tipo="tel"
              inputMode="tel"
              placeholder="Ej: 5491122334455"
            />

            <details className="rounded-xl border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-600">
                Más datos del cliente
              </summary>
              <div className="space-y-3 px-4 pb-4">
                <Campo etiqueta="Documento" valor={doc} onCambio={setDoc} placeholder="Opcional" />
                <Campo etiqueta="Dirección" valor={direccion} onCambio={setDireccion} placeholder="Opcional" />
              </div>
            </details>

            <div>
              <span className="mb-1 block text-sm font-medium text-slate-600">Formato</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['ticket', 'Ticket', 'Se lee en el celular'],
                    ['a4', 'Hoja A4', 'Para imprimir'],
                  ] as const
                ).map(([id, titulo, ayuda]) => (
                  <button
                    key={id}
                    onClick={() => setFormato(id)}
                    className={`rounded-xl border-2 px-3 py-3 text-left ${
                      formato === id
                        ? 'border-marca-600 bg-marca-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="font-semibold">{titulo}</div>
                    <div className="text-xs text-slate-500">{ayuda}</div>
                  </button>
                ))}
              </div>
            </div>

            <Boton onClick={generar} disabled={generando} className="w-full text-lg">
              {generando ? 'Generando...' : 'Generar boleta'}
            </Boton>
          </>
        )}
      </div>
    </Hoja>
  )
}

interface AccionesProps {
  boleta: Boleta
  onAviso: (texto: string) => void
  onListo?: () => void
}

/** Los tres botones que aparecen con la boleta ya generada. */
export function AccionesBoleta({ boleta, onAviso, onListo }: AccionesProps) {
  const [telefono, setTelefono] = useState(boleta.clienteTelefono)
  const nombreArchivo = `${boleta.numero}.pdf`

  const pdf = async (): Promise<Blob | null> => {
    if (boleta.id) {
      const guardado = await leerPdf(boleta.id)
      if (guardado) return guardado
    }
    // Las boletas viejas pueden tener el PDF borrado para no ocupar lugar:
    // se vuelve a armar desde los datos guardados, que no cambian nunca.
    const regenerado = await generarBoletaPdf(boleta, await datosTienda())
    if (boleta.id) await guardarPdf(boleta.id, regenerado)
    return regenerado
  }

  const enviar = async () => {
    const archivo = await pdf()
    if (!archivo) return

    const tienda = await datosTienda()
    const mensaje = `${tienda.nombre}\nBoleta ${boleta.numero}\nTotal: ${plata(boleta.total)}\n\n¡Gracias por su compra!`
    const r = await enviarPorWhatsapp(archivo, nombreArchivo, telefono, mensaje)

    if (r.via === 'cancelado') return

    if (boleta.id) {
      await db.boletas.update(boleta.id, {
        enviada: 1,
        enviadaA: telefono,
        fechaEnvio: new Date(),
      })
    }
    onAviso(
      r.via === 'compartir'
        ? 'Boleta lista para enviar'
        : 'PDF descargado. Adjuntalo en el chat de WhatsApp que se abrió.',
    )
    onListo?.()
  }

  return (
    <div className="space-y-3">
      <Campo
        etiqueta="Enviar al teléfono"
        valor={telefono}
        onCambio={setTelefono}
        tipo="tel"
        inputMode="tel"
        placeholder="Ej: 5491122334455"
      />

      <Boton onClick={enviar} className="w-full text-lg">
        📲 Enviar por WhatsApp
      </Boton>

      <div className="grid grid-cols-2 gap-3">
        <Boton
          tipo="secundario"
          onClick={async () => {
            const a = await pdf()
            if (a) {
              descargarPdf(a, nombreArchivo)
              onAviso('PDF guardado en Descargas')
            }
          }}
        >
          💾 Guardar
        </Boton>
        <Boton
          tipo="secundario"
          onClick={async () => {
            const a = await pdf()
            if (a) verPdf(a)
          }}
        >
          👁 Ver
        </Boton>
      </div>

      <p className="px-1 text-center text-xs text-slate-500">
        WhatsApp pide que la persona confirme el envío. El sistema deja la boleta adjunta y el
        mensaje escrito: solo falta tocar enviar.
      </p>
    </div>
  )
}

async function datosTienda(): Promise<DatosTienda> {
  return {
    nombre: await leerConfig('tiendaNombre', 'Mi Tienda'),
    direccion: await leerConfig('tiendaDireccion'),
    telefono: await leerConfig('tiendaTelefono'),
  }
}

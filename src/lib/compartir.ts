import { telefonoWhatsapp } from './formato'

/** Baja el PDF a la carpeta de Descargas del dispositivo. */
export function descargarPdf(pdf: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(pdf)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Se libera con un respiro para no cortar la descarga en Safari.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Abre el PDF en una pestaña nueva para revisarlo antes de mandarlo. */
export function verPdf(pdf: Blob): void {
  const url = URL.createObjectURL(pdf)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export type ResultadoEnvio =
  | { via: 'compartir' }
  | { via: 'whatsapp-sin-archivo' }
  | { via: 'cancelado' }

/**
 * Deja la boleta lista para enviar por WhatsApp. El envío final siempre lo
 * confirma la persona: WhatsApp no permite que una app mande mensajes sola
 * sin pasar por la API oficial de Meta (que necesita servidor y cuenta de empresa).
 *
 * Camino principal: compartir el PDF adjunto con el selector del sistema.
 * Camino de respaldo (navegador de escritorio, o sin soporte de archivos):
 * se descarga el PDF y se abre el chat de ese número con el mensaje escrito,
 * para adjuntarlo a mano.
 */
export async function enviarPorWhatsapp(
  pdf: Blob,
  nombreArchivo: string,
  telefono: string,
  mensaje: string,
): Promise<ResultadoEnvio> {
  const archivo = new File([pdf], nombreArchivo, { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], text: mensaje })
      return { via: 'compartir' }
    } catch (e) {
      // El usuario cerró el selector: no es un error que haya que mostrar.
      if (e instanceof DOMException && e.name === 'AbortError') return { via: 'cancelado' }
    }
  }

  descargarPdf(pdf, nombreArchivo)
  const numero = telefonoWhatsapp(telefono)
  const url = numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`
  window.open(url, '_blank')
  return { via: 'whatsapp-sin-archivo' }
}

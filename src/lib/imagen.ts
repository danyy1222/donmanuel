/** Lado máximo de la foto guardada. Se muestra en miniaturas de 64px. */
const LADO_MAXIMO = 480

/**
 * Achica la foto antes de guardarla.
 *
 * La cámara de un celular saca imágenes de 4000px y 3 MB. Guardarlas tal cual
 * llenaría la base y haría lenta cualquier pantalla que liste productos, para
 * dibujar una miniatura de 64 píxeles. A 480px una foto queda en unos 40 KB.
 */
export function achicarFoto(archivo: File): Promise<Blob> {
  return achicar(archivo, LADO_MAXIMO, 'image/jpeg', 0.82)
}

/**
 * Achica el QR de cobro.
 *
 * Va en PNG y más grande que una foto: el JPEG con calidad baja emborrona los
 * cuadraditos, y este QR lo tiene que leer la cámara del cliente desde el otro
 * lado del mostrador.
 */
export function achicarQr(archivo: File): Promise<Blob> {
  return achicar(archivo, 720, 'image/png', 1)
}

async function achicar(
  archivo: File,
  ladoMaximo: number,
  formato: string,
  calidad: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)

  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto

  const ctx = lienzo.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return archivo
  }

  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const reducida = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, formato, calidad))

  // Si por lo que sea la conversión no achicó nada, se guarda el original.
  return reducida && reducida.size < archivo.size ? reducida : archivo
}

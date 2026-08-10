/**
 * Perú usa punto para los decimales y coma para los miles: S/ 1,234.50.
 * Es al revés que en gran parte de Sudamérica, así que conviene tenerlo en un
 * solo lugar y no repetir el criterio por la app.
 */
const MONEDA = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Separador decimal del país. Lo usan el teclado y los campos numéricos. */
export const SEPARADOR_DECIMAL = '.'

/** Símbolo del sol peruano. Va acá para no repetirlo suelto por las pantallas. */
export const SIMBOLO = 'S/'

/** Formatea un importe: 4.5 → "S/ 4.50", 1234.5 → "S/ 1,234.50" */
export function plata(n: number): string {
  return `S/ ${MONEDA.format(Math.round(n * 100) / 100)}`
}

/** Formatea kilos con 3 decimales, como los muestra una balanza: "0.750 kg" */
export function kilos(n: number): string {
  return `${n.toFixed(3)} kg`
}

/** Texto de la cantidad de un ítem según cómo se vende el producto. */
export function cantidadTexto(cantidad: number, tipo: 'unidad' | 'peso' | 'atado'): string {
  if (tipo === 'peso') return kilos(cantidad)
  if (tipo === 'atado') return `${cantidad} atado${cantidad === 1 ? '' : 's'}`
  return `${cantidad} u.`
}

export function fechaHora(d: Date): string {
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fechaCorta(d: Date): string {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/**
 * Deja el teléfono como lo quiere WhatsApp: solo dígitos con código de país.
 * Los celulares peruanos tienen 9 dígitos y empiezan con 9; si viene así, se
 * le antepone el 51 de Perú.
 */
export function telefonoWhatsapp(tel: string): string {
  const digitos = tel.replace(/\D/g, '')
  if (digitos.length === 9 && digitos.startsWith('9')) return `51${digitos}`
  return digitos
}

/** Quita tildes y pasa a minúsculas, para que "limon" encuentre "Limón". */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

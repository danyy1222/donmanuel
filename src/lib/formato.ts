const MONEDA = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** Formatea un importe: 1800 → "$1.800", 1250.5 → "$1.250,5" */
export function plata(n: number): string {
  return `$${MONEDA.format(Math.round(n * 100) / 100)}`
}

/** Formatea kilos con 3 decimales, como los muestra una balanza: "0,750 kg" */
export function kilos(n: number): string {
  return `${n.toFixed(3).replace('.', ',')} kg`
}

/** Texto de la cantidad de un ítem según cómo se vende el producto. */
export function cantidadTexto(cantidad: number, tipo: 'unidad' | 'peso' | 'atado'): string {
  if (tipo === 'peso') return kilos(cantidad)
  if (tipo === 'atado') return `${cantidad} atado${cantidad === 1 ? '' : 's'}`
  return `${cantidad} u.`
}

export function fechaHora(d: Date): string {
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fechaCorta(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/**
 * Deja el teléfono como lo quiere WhatsApp: solo dígitos.
 * No agrega código de país porque varía según dónde esté la tienda; se espera
 * que el número se cargue completo.
 */
export function telefonoWhatsapp(tel: string): string {
  return tel.replace(/\D/g, '')
}

/** Quita tildes y pasa a minúsculas, para que "morron" encuentre "Morrón". */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

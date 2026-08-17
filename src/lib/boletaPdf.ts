import type { jsPDF } from 'jspdf'
import type { Boleta } from '../db/db'
import { cantidadTexto, fechaHora, plata } from './formato'

export interface DatosTienda {
  nombre: string
  direccion: string
  telefono: string
}

const METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

/**
 * Arma el PDF de la boleta dentro del navegador, sin servidor.
 *
 * El formato 'ticket' es una tira angosta de 80mm de ancho y alto variable:
 * entra completa en la pantalla de un celular sin tener que agrandar, que es
 * donde el cliente la va a leer. El formato 'a4' es para imprimir en hoja.
 *
 * jsPDF se importa acá adentro y no arriba: pesa más de la mitad del bundle y
 * solo hace falta cuando alguien pide comprobante, no en cada venta.
 */
export async function generarBoletaPdf(boleta: Boleta, tienda: DatosTienda): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  if (boleta.formato === 'a4') {
    const { default: autoTable } = await import('jspdf-autotable')
    return enA4(new jsPDF({ unit: 'mm', format: 'a4' }), autoTable, boleta, tienda)
  }
  return enTicket(jsPDF, boleta, tienda)
}

type ConstructorJsPDF = typeof import('jspdf').jsPDF
type AutoTable = typeof import('jspdf-autotable').default

const ANCHO_TICKET = 80

/**
 * El alto del ticket depende de cuántos ítems haya y de qué datos del cliente
 * se cargaron. En vez de estimarlo con una fórmula —que se desactualiza en
 * cuanto cambia el diseño y corta el pie— se dibuja dos veces: la primera en
 * un documento descartable, solo para medir dónde termina.
 */
function enTicket(JsPDF: ConstructorJsPDF, boleta: Boleta, tienda: DatosTienda): Blob {
  const medida = new JsPDF({ unit: 'mm', format: [ANCHO_TICKET, 1000] })
  const alto = dibujarTicket(medida, boleta, tienda) + 5

  const doc = new JsPDF({ unit: 'mm', format: [ANCHO_TICKET, alto] })
  dibujarTicket(doc, boleta, tienda)
  return doc.output('blob')
}

/** Dibuja el ticket y devuelve la coordenada vertical donde terminó. */
function dibujarTicket(doc: jsPDF, boleta: Boleta, tienda: DatosTienda): number {
  const ancho = ANCHO_TICKET
  const margen = 5
  const util = ancho - margen * 2
  let y = margen + 3

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(tienda.nombre || 'Mi Tienda', ancho / 2, y, { align: 'center' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  for (const linea of [tienda.direccion, tienda.telefono].filter(Boolean)) {
    doc.text(linea, ancho / 2, y, { align: 'center' })
    y += 3.5
  }

  y += 1.5
  linea(doc, margen, y, ancho - margen)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`BOLETA ${boleta.numero}`, margen, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(fechaHora(boleta.fecha), margen, y)
  y += 4

  if (boleta.clienteNombre) {
    doc.text(`Cliente: ${boleta.clienteNombre}`, margen, y)
    y += 3.5
  }
  if (boleta.clienteDoc) {
    doc.text(`Doc: ${boleta.clienteDoc}`, margen, y)
    y += 3.5
  }
  if (boleta.clienteDireccion) {
    doc.text(`Dir: ${boleta.clienteDireccion}`, margen, y)
    y += 3.5
  }

  y += 1
  linea(doc, margen, y, ancho - margen)
  y += 4

  for (const item of boleta.items) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(recortar(doc, item.nombre, util), margen, y)
    y += 3.6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    const detalle = `${cantidadTexto(item.cantidad, item.tipoVenta)} x ${plata(item.precioUnit)}${
      item.tipoVenta === 'peso' ? '/kg' : ''
    }`
    doc.text(detalle, margen, y)
    doc.text(plata(item.subtotal), ancho - margen, y, { align: 'right' })
    y += 5
  }

  linea(doc, margen, y, ancho - margen)
  y += 4.5

  doc.setFontSize(8)
  if (boleta.descuento > 0) {
    fila(doc, 'Subtotal', plata(boleta.subtotal), margen, ancho - margen, y)
    y += 4
    fila(doc, 'Descuento', `-${plata(boleta.descuento)}`, margen, ancho - margen, y)
    y += 4
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('TOTAL', margen, y + 1)
  doc.text(plata(boleta.total), ancho - margen, y + 1, { align: 'right' })
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`Pago: ${METODO[boleta.metodoPago] ?? boleta.metodoPago}`, margen, y)
  y += 5

  doc.setFontSize(6.5)
  doc.setTextColor(120)
  doc.text('Documento no fiscal', ancho / 2, y, { align: 'center' })
  y += 3
  doc.text('¡Gracias por su compra!', ancho / 2, y, { align: 'center' })

  return y
}

function enA4(doc: jsPDF, autoTable: AutoTable, boleta: Boleta, tienda: DatosTienda): Blob {
  const ancho = 210
  const margen = 18
  const derecha = ancho - margen
  let y = 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(tienda.nombre || 'Mi Tienda', margen, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`BOLETA ${boleta.numero}`, derecha, y, { align: 'right' })
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90)
  for (const linea of [tienda.direccion, tienda.telefono].filter(Boolean)) {
    doc.text(linea, margen, y)
    y += 4.5
  }
  doc.text(fechaHora(boleta.fecha), derecha, y - 4.5, { align: 'right' })

  doc.setTextColor(0)
  y += 4
  linea(doc, margen, y, derecha)
  y += 7

  if (boleta.clienteNombre || boleta.clienteTelefono) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('CLIENTE', margen, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    for (const linea of [
      boleta.clienteNombre,
      boleta.clienteTelefono,
      boleta.clienteDoc && `Doc: ${boleta.clienteDoc}`,
      boleta.clienteDireccion,
    ].filter(Boolean) as string[]) {
      doc.text(linea, margen, y)
      y += 4.5
    }
    y += 4
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen },
    head: [['Producto', 'Cantidad', 'Precio unit.', 'Subtotal']],
    body: boleta.items.map((i) => [
      i.nombre,
      cantidadTexto(i.cantidad, i.tipoVenta),
      plata(i.precioUnit) + (i.tipoVenta === 'peso' ? '/kg' : ''),
      plata(i.subtotal),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    // Morado de marca (#7e22ce). Ver marca.json.
    headStyles: { fillColor: [126, 34, 206], halign: 'left' },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  doc.setFontSize(10)
  if (boleta.descuento > 0) {
    fila(doc, 'Subtotal', plata(boleta.subtotal), derecha - 55, derecha, y)
    y += 5
    fila(doc, 'Descuento', `-${plata(boleta.descuento)}`, derecha - 55, derecha, y)
    y += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('TOTAL', derecha - 55, y + 2)
  doc.text(plata(boleta.total), derecha, y + 2, { align: 'right' })
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Forma de pago: ${METODO[boleta.metodoPago] ?? boleta.metodoPago}`, margen, y)
  y += 12

  doc.setFontSize(8)
  doc.setTextColor(130)
  doc.text('Documento no fiscal', margen, y)

  return doc.output('blob')
}

function linea(doc: jsPDF, x1: number, y: number, x2: number): void {
  doc.setDrawColor(190)
  doc.setLineWidth(0.2)
  doc.line(x1, y, x2, y)
}

function fila(doc: jsPDF, etiqueta: string, valor: string, x1: number, x2: number, y: number): void {
  doc.setFont('helvetica', 'normal')
  doc.text(etiqueta, x1, y)
  doc.text(valor, x2, y, { align: 'right' })
}

/** Corta el texto con puntos suspensivos si no entra en el ancho del ticket. */
function recortar(doc: jsPDF, texto: string, ancho: number): string {
  if (doc.getTextWidth(texto) <= ancho) return texto
  let corto = texto
  while (corto.length > 3 && doc.getTextWidth(`${corto}...`) > ancho) {
    corto = corto.slice(0, -1)
  }
  return `${corto}...`
}

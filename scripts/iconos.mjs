// Genera los PNG del manifest a partir de public/icono.svg.
// Correr con: node scripts/iconos.mjs
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// fileURLToPath y no .pathname: la ruta del proyecto tiene un espacio y
// quedaría como %20 sin decodificar.
const ruta = (nombre) => fileURLToPath(new URL(`../public/${nombre}`, import.meta.url))

const svg = await readFile(ruta('icono.svg'))

for (const tamano of [192, 512]) {
  await sharp(svg, { density: 400 }).resize(tamano, tamano).png().toFile(ruta(`icono-${tamano}.png`))
  console.log(`icono-${tamano}.png listo`)
}

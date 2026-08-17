// Simula cómo Android compone el icono adaptativo: fondo + primer plano,
// recortado con la máscara circular que usan la mayoría de los lanzadores.
// Sirve para revisar el icono sin tener que instalar el APK.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const res = (p) => fileURLToPath(new URL(`../android/app/src/main/res/${p}`, import.meta.url))
const LADO = 432 // 108dp a xxxhdpi

const MARCA = JSON.parse(
  await readFile(fileURLToPath(new URL('../marca.json', import.meta.url)), 'utf8'),
).color

const fondo = await sharp({
  create: { width: LADO, height: LADO, channels: 4, background: MARCA },
})
  .png()
  .toBuffer()

const frente = await sharp(res('mipmap-xxxhdpi/ic_launcher_foreground.png'))
  .resize(LADO, LADO)
  .toBuffer()

// Android recorta al 72% central del lienzo de 108dp.
const radio = Math.round((LADO * 0.72) / 2)
const mascara = Buffer.from(
  `<svg width="${LADO}" height="${LADO}"><circle cx="${LADO / 2}" cy="${LADO / 2}" r="${radio}" fill="#fff"/></svg>`,
)

const salida = fileURLToPath(new URL('../icono-preview.png', import.meta.url))
await sharp(fondo)
  .composite([{ input: frente }, { input: mascara, blend: 'dest-in' }])
  .png()
  .toFile(salida)

console.log('icono-preview.png listo')

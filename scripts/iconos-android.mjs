// Reemplaza los iconos por defecto de Capacitor por el logo de la tienda.
// Correr con: node scripts/iconos-android.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const res = (p) => fileURLToPath(new URL(`../android/app/src/main/res/${p}`, import.meta.url))

// Densidades de Android: el icono del lanzador mide 48dp y cada una lo escala.
const DENSIDADES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }

// El color sale de marca.json para no tenerlo repetido en cada script.
const MARCA = JSON.parse(
  await readFile(fileURLToPath(new URL('../marca.json', import.meta.url)), 'utf8'),
).color

// Bolsa de compras con una fruta adentro. La versión anterior tenía tres
// líneas verticales que a tamaño chico la hacían leer como tacho de basura.
const bolsa = `
  <path d="M156 176h200l-20 180a26 26 0 0 1-26 23H202a26 26 0 0 1-26-23z" fill="#fff"/>
  <path d="M208 176a48 48 0 0 1 96 0" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round"/>
  <path d="M256 232c34 0 54 22 54 50s-24 46-54 46-54-18-54-46 20-50 54-50z" fill="${MARCA}"/>
  <path d="M256 232c-6-18-2-32 10-42 6 14 4 30-10 42z" fill="${MARCA}"/>`

const completo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${MARCA}"/>${bolsa}
</svg>`

// El foreground del icono adaptativo va sobre fondo transparente y con margen:
// Android recorta los bordes según la forma que use cada lanzador.
const primerPlano = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g transform="translate(256 256) scale(0.62) translate(-256 -256)">${bolsa}</g>
</svg>`

for (const [densidad, base] of Object.entries(DENSIDADES)) {
  const carpeta = res(`mipmap-${densidad}`)
  await mkdir(carpeta, { recursive: true })

  await sharp(Buffer.from(completo), { density: 400 })
    .resize(base, base)
    .png()
    .toFile(`${carpeta}/ic_launcher.png`)

  await sharp(Buffer.from(completo), { density: 400 })
    .resize(base, base)
    .png()
    .toFile(`${carpeta}/ic_launcher_round.png`)

  // El foreground se dibuja a 108dp, más grande que el icono en sí.
  const grande = Math.round((base * 108) / 48)
  await sharp(Buffer.from(primerPlano), { density: 400 })
    .resize(grande, grande)
    .png()
    .toFile(`${carpeta}/ic_launcher_foreground.png`)

  console.log(`mipmap-${densidad} listo (${base}px)`)
}

// El icono adaptativo usa este color como fondo detrás de la bolsa.
await writeFile(
  res('values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${MARCA}</color>
</resources>
`,
)

// Capacitor deja un foreground vectorial propio que pisaría al PNG recién generado.
await writeFile(
  res('drawable-v24/ic_launcher_foreground.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@mipmap/ic_launcher_foreground" />
`,
)

console.log('color de fondo y foreground actualizados')

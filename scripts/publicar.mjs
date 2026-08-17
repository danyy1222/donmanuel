// Publica una versión: crea el Release en GitHub con el APK adjunto, actualiza
// version.json y purga el caché del CDN.
//
//   node scripts/publicar.mjs 1.2.2 "Qué cambió en esta versión"
//
// Requisitos: haber corrido `npm run apk` antes, y que `git push` funcione
// (de ahí sale la credencial de GitHub).
import { execFileSync } from 'node:child_process'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const REPO = 'danyy1222/donmanuel'
const raiz = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))

const [version, notas] = process.argv.slice(2)
if (!version || !notas) {
  console.error('Uso: node scripts/publicar.mjs 1.2.2 "qué cambió"')
  process.exit(1)
}

const paquete = JSON.parse(await readFile(raiz('package.json'), 'utf8'))
if (paquete.version !== version) {
  console.error(
    `package.json dice ${paquete.version} pero se quiere publicar ${version}.\n` +
      'El APK compilado llevaría la versión vieja adentro: corregí package.json y volvé a correr `npm run apk`.',
  )
  process.exit(1)
}

const token = execFileSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
}).match(/^password=(.*)$/m)?.[1]

if (!token) {
  console.error('No hay credencial de GitHub guardada. Probá un `git push` primero.')
  process.exit(1)
}

const api = (url, opciones = {}) =>
  fetch(url, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...opciones.headers,
    },
  })

// 1. El Release. Si ya existía se borra: republicar la misma versión con otro
// contenido dejaría el enlace apuntando al archivo viejo.
const previo = await api(`https://api.github.com/repos/${REPO}/releases/tags/v${version}`)
if (previo.ok) {
  const { id } = await previo.json()
  console.log(`Borrando el release v${version} anterior...`)
  await api(`https://api.github.com/repos/${REPO}/releases/${id}`, { method: 'DELETE' })
}

console.log(`Creando release v${version}...`)
const creado = await api(`https://api.github.com/repos/${REPO}/releases`, {
  method: 'POST',
  body: JSON.stringify({ tag_name: `v${version}`, name: `Versión ${version}`, body: notas }),
})
if (!creado.ok) {
  console.error(`Error ${creado.status}:`, (await creado.text()).slice(0, 400))
  process.exit(1)
}

// 2. El APK
const { upload_url, html_url } = await creado.json()
const APK = raiz('sistema-tienda.apk')
console.log(`Subiendo el APK (${(((await stat(APK)).size) / 1024 / 1024).toFixed(1)} MB)...`)

const subido = await api(`${upload_url.replace(/\{.*\}$/, '')}?name=tienda-don-manuel-v${version}.apk`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/vnd.android.package-archive' },
  body: await readFile(APK),
})
if (!subido.ok) {
  console.error(`Error al subir ${subido.status}:`, (await subido.text()).slice(0, 300))
  process.exit(1)
}
const { browser_download_url } = await subido.json()

// 3. El aviso. Recién ahora, con el archivo ya disponible: al revés, los
// celulares verían un enlace de descarga que todavía no existe.
console.log('Actualizando version.json...')
const versiones = JSON.parse(await readFile(raiz('version.json'), 'utf8'))
await writeFile(
  raiz('version.json'),
  JSON.stringify({ ...versiones, version, novedades: notas, descarga: browser_download_url }, null, 2) + '\n',
)

execFileSync('git', ['add', 'version.json'], { cwd: raiz('') })
execFileSync('git', ['commit', '-m', `Publicar la versión ${version}`], { cwd: raiz('') })
execFileSync('git', ['push'], { cwd: raiz('') })

// 4. Purgar el CDN. Sin esto jsDelivr sigue sirviendo la versión anterior
// hasta doce horas, y los celulares no se enterarían de la actualización.
console.log('Purgando el caché del CDN...')
const purga = await fetch(`https://purge.jsdelivr.net/gh/${REPO}@main/version.json`)
console.log(purga.ok ? '  purgado' : `  no se pudo purgar (${purga.status}), puede tardar en propagarse`)

console.log(`\nPublicado: ${html_url}`)
console.log(`Descarga:  ${browser_download_url}`)

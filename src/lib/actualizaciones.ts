/** Lo inyecta Vite desde package.json al compilar. */
declare const __VERSION_APP__: string
/** Lo inyecta Vite según se compile con `npm run apk` o `npm run apk:pruebas`. */
declare const __CANAL__: string

export const VERSION_APP = __VERSION_APP__

/**
 * Si esta es la compilación de pruebas.
 *
 * La app de pruebas es otra app para Android: tiene su propio identificador, se
 * instala al lado de la de la tienda y no comparte la base de datos.
 */
export const ES_PRUEBAS = __CANAL__ === 'pruebas'

/**
 * De dónde se lee el archivo de versiones, en orden de preferencia.
 *
 * Se prueban varias porque `raw.githubusercontent.com` corta con 429 cuando
 * recibe muchas consultas desde la misma IP, y todos los celulares de una
 * tienda salen por la misma conexión. jsDelivr es un CDN gratuito que sirve
 * archivos de repositorios públicos de GitHub sin ese límite; queda primero y
 * raw como respaldo.
 *
 * Las dos funcionan sin contraseña porque el repositorio es público. Si pasara
 * a privado hay que mover el archivo a otro lado (GitHub Pages, por ejemplo):
 * una clave metida dentro del APK no sería secreta.
 */
const FUENTES = [
  'https://cdn.jsdelivr.net/gh/danyy1222/donmanuel@main/version.json',
  'https://raw.githubusercontent.com/danyy1222/donmanuel/main/version.json',
]

/** Cada cuánto se vuelve a preguntar. Revisar en cada apertura gastaría datos. */
const CADA = 60 * 60 * 1000 // una hora

const CLAVE_ULTIMA_REVISION = 'ultimaRevisionActualizacion'
const CLAVE_POSPUESTA = 'versionPospuesta'
const CLAVE_SILENCIO = 'avisoSilenciadoHasta'

/**
 * Cuánto se calla el aviso después de tocar Descargar.
 *
 * Es un silencio con vencimiento y no definitivo: si la descarga se cortó o la
 * instalación quedó a medias, la app tiene que volver a insistir. Si en cambio
 * la instalación salió bien, la versión ya coincide y no hay nada que avisar.
 */
const SILENCIO_TRAS_DESCARGAR = 6 * 60 * 60 * 1000 // seis horas

export interface Actualizacion {
  version: string
  novedades: string
  descarga: string
}

/**
 * Compara dos versiones tipo "1.2.3". Devuelve true si `candidata` es
 * posterior a `instalada`.
 *
 * Se compara número por número y no como texto: "1.10.0" es mayor que "1.9.0",
 * pero alfabéticamente sería al revés.
 */
export function esMasNueva(candidata: string, instalada: string): boolean {
  const a = candidata.split('.').map(Number)
  const b = instalada.split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/**
 * Busca si hay una versión más nueva publicada.
 *
 * Devuelve null cuando no hay nada nuevo, cuando no hay internet o cuando el
 * usuario ya pospuso esa misma versión. Nunca lanza: quedarse sin señal no
 * puede romper la apertura de la app.
 */
export async function buscarActualizacion(
  forzar = false,
): Promise<Actualizacion | null> {
  try {
    // La app de pruebas no busca actualizaciones nunca. Se instala a mano en el
    // celular de prueba y ahí se queda. Así el canal de pruebas no puede
    // llegarle por error a los celulares de la tienda: no hay disciplina que
    // mantener, sencillamente no existe el camino.
    if (ES_PRUEBAS) return null

    if (!forzar) {
      const ultima = Number(localStorage.getItem(CLAVE_ULTIMA_REVISION) ?? 0)
      if (Date.now() - ultima < CADA) return null
    }

    const datos = await leerDeLasFuentes()
    if (!datos) return null

    localStorage.setItem(CLAVE_ULTIMA_REVISION, String(Date.now()))

    if (!datos.version || !esMasNueva(datos.version, VERSION_APP)) return null

    if (!forzar) {
      if (localStorage.getItem(CLAVE_POSPUESTA) === datos.version) return null
      if (Date.now() < Number(localStorage.getItem(CLAVE_SILENCIO) ?? 0)) return null
    }

    return {
      version: datos.version,
      novedades: datos.novedades ?? '',
      descarga: datos.descarga ?? '',
    }
  } catch {
    // Sin internet o el archivo mal formado: se reintenta la próxima vez.
    return null
  }
}

/**
 * Prueba las fuentes en orden y devuelve la primera que conteste bien.
 * Si una da 429 o está caída, sigue con la siguiente.
 */
async function leerDeLasFuentes(): Promise<Partial<Actualizacion> | null> {
  for (const fuente of FUENTES) {
    try {
      // El parámetro de tiempo evita que el navegador sirva una copia vieja.
      const respuesta = await fetch(`${fuente}?t=${Date.now()}`, { cache: 'no-store' })
      if (!respuesta.ok) continue

      // Cuando GitHub corta por exceso de consultas devuelve una página HTML
      // con estado 200, así que no alcanza con mirar el código de respuesta.
      const texto = await respuesta.text()
      if (!texto.trimStart().startsWith('{')) continue

      return JSON.parse(texto) as Partial<Actualizacion>
    } catch {
      // Fuente caída o sin señal: se prueba la siguiente.
    }
  }
  return null
}

/** Deja de avisar por esta versión hasta que salga otra. */
export function posponer(version: string): void {
  localStorage.setItem(CLAVE_POSPUESTA, version)
}

/**
 * Calla el aviso un rato después de mandar a descargar, sin darlo por
 * instalado. Si la descarga o la instalación no llegaron a buen puerto, la app
 * vuelve a avisar sola en unas horas.
 */
export function silenciarUnRato(): void {
  localStorage.setItem(CLAVE_SILENCIO, String(Date.now() + SILENCIO_TRAS_DESCARGAR))
}

/** Lo inyecta Vite desde package.json al compilar. */
declare const __VERSION_APP__: string

export const VERSION_APP = __VERSION_APP__

/**
 * Archivo de versiones publicado en el repositorio. Se lee de raw, que sirve
 * el contenido del archivo sin envolverlo en la página de GitHub.
 *
 * Funciona sin contraseña porque el repositorio es público. Si algún día pasa
 * a privado hay que mover este archivo a otro lado (por ejemplo GitHub Pages),
 * porque una clave metida dentro del APK no sería secreta.
 */
const URL_VERSIONES =
  'https://raw.githubusercontent.com/danyy1222/donmanuel/main/version.json'

/** Cada cuánto se vuelve a preguntar. Revisar en cada apertura gastaría datos. */
const CADA = 60 * 60 * 1000 // una hora

const CLAVE_ULTIMA_REVISION = 'ultimaRevisionActualizacion'
const CLAVE_POSPUESTA = 'versionPospuesta'

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
    if (!forzar) {
      const ultima = Number(localStorage.getItem(CLAVE_ULTIMA_REVISION) ?? 0)
      if (Date.now() - ultima < CADA) return null
    }

    // Sin caché: si no, el navegador puede devolver la versión vieja del archivo.
    const respuesta = await fetch(`${URL_VERSIONES}?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!respuesta.ok) return null

    const datos = (await respuesta.json()) as Partial<Actualizacion>
    localStorage.setItem(CLAVE_ULTIMA_REVISION, String(Date.now()))

    if (!datos.version || !esMasNueva(datos.version, VERSION_APP)) return null
    if (!forzar && localStorage.getItem(CLAVE_POSPUESTA) === datos.version) return null

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

/** Deja de avisar por esta versión hasta que salga otra. */
export function posponer(version: string): void {
  localStorage.setItem(CLAVE_POSPUESTA, version)
}

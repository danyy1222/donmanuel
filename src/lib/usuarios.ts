import { db, type Rol, type Usuario } from '../db/db'

export interface Sesion {
  usuario: Usuario
}

/** Qué puede hacer cada rol. El cajero vende; el resto es del dueño. */
export const PERMISOS = {
  dueño: {
    verCostos: true,
    editarProductos: true,
    verReportes: true,
    gestionarUsuarios: true,
    configurarTienda: true,
    respaldar: true,
  },
  cajero: {
    verCostos: false,
    editarProductos: false,
    verReportes: false,
    gestionarUsuarios: false,
    configurarTienda: false,
    respaldar: false,
  },
} as const satisfies Record<Rol, Record<string, boolean>>

export type Permiso = keyof (typeof PERMISOS)['dueño']

export function puede(sesion: Sesion, permiso: Permiso): boolean {
  return PERMISOS[sesion.usuario.rol][permiso]
}

/**
 * Deriva el PIN a un hash SHA-256 con sal.
 *
 * No es una defensa contra alguien que se lleve el celular y sepa lo que hace
 * —un PIN de 4 dígitos se prueba entero en segundos—, pero evita lo que
 * realmente pasa en una tienda: que un empleado abra la base y lea el PIN del
 * dueño en texto plano.
 */
async function derivar(pin: string, sal: string): Promise<string> {
  const datos = new TextEncoder().encode(`${sal}:${pin}`)
  const hash = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function salNueva(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function crearUsuario(nombre: string, pin: string, rol: Rol): Promise<number> {
  const sal = salNueva()
  return db.usuarios.add({
    nombre: nombre.trim(),
    pinHash: await derivar(pin, sal),
    sal,
    rol,
    activo: 1,
    creado: new Date(),
  })
}

export async function cambiarPin(usuarioId: number, pin: string): Promise<void> {
  const sal = salNueva()
  await db.usuarios.update(usuarioId, { pinHash: await derivar(pin, sal), sal })
}

export async function verificarPin(usuario: Usuario, pin: string): Promise<boolean> {
  return (await derivar(pin, usuario.sal)) === usuario.pinHash
}

export async function usuariosActivos(): Promise<Usuario[]> {
  return db.usuarios.where('activo').equals(1).toArray()
}

export async function hayUsuarios(): Promise<boolean> {
  return (await db.usuarios.where('activo').equals(1).count()) > 0
}

/**
 * Impide quedarse sin ningún dueño: si se da de baja al último, nadie podría
 * volver a entrar a la configuración ni crear usuarios.
 */
export async function esUltimoDueño(usuarioId: number): Promise<boolean> {
  const dueños = await db.usuarios.where('activo').equals(1).and((u) => u.rol === 'dueño').toArray()
  return dueños.length === 1 && dueños[0].id === usuarioId
}

const CLAVE_SESION = 'sesionUsuarioId'

/** La sesión sobrevive a cerrar la app, como espera cualquiera en el mostrador. */
export function recordarSesion(usuarioId: number): void {
  localStorage.setItem(CLAVE_SESION, String(usuarioId))
}

export function olvidarSesion(): void {
  localStorage.removeItem(CLAVE_SESION)
}

export async function sesionGuardada(): Promise<Usuario | null> {
  const id = Number(localStorage.getItem(CLAVE_SESION))
  if (!id) return null
  const usuario = await db.usuarios.get(id)
  return usuario?.activo === 1 ? usuario : null
}

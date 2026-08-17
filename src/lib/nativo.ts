import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/** Color de marca, el mismo del encabezado y del ícono. Ver marca.json. */
const MARCA = '#7e22ce'

/**
 * Ajusta la barra de estado del sistema (hora, batería, notificaciones) para
 * que no se superponga con la app.
 *
 * Desde Android 15 la pantalla completa es obligatoria y `overlay: false` deja
 * de alcanzar, así que además se reserva el espacio por CSS con
 * `env(safe-area-inset-top)`. Las dos vías conviven: cuando una funciona la
 * otra mide cero.
 */
export async function prepararPantalla(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setBackgroundColor({ color: MARCA })
    // 'Dark' es el estilo de fondo oscuro: pinta los íconos y la hora en blanco.
    await StatusBar.setStyle({ style: Style.Dark })
  } catch {
    // Si el plugin no está disponible, el padding por CSS sigue cubriendo el caso.
  }
}

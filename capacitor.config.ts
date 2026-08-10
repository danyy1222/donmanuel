import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tienda.sistema',
  appName: 'Sistema Tienda',
  webDir: 'dist',
  android: {
    // La app se sirve desde https://localhost dentro del WebView, que cuenta
    // como origen seguro: sin esto la cámara no arranca ni con el permiso dado.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config

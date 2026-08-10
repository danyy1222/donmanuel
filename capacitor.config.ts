import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // El appId no se toca aunque cambie el nombre visible: Android usa este
  // identificador para saber que es la misma app. Si cambiara, se instalaría
  // al lado de la anterior en vez de encima y los datos quedarían inaccesibles.
  appId: 'com.tienda.sistema',
  appName: 'Tienda Don Manuel',
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

const NOMBRES_NATIVOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']

interface DetectorNativo {
  detect(fuente: CanvasImageSource): Promise<{ rawValue: string }[]>
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (opciones?: { formats?: string[] }): DetectorNativo
      getSupportedFormats?: () => Promise<string[]>
    }
  }
}

export interface Escaneo {
  detener: () => void
  pausar: () => void
  reanudar: () => void
}

/**
 * Cuánto hay que esperar para volver a aceptar el mismo código. La cámara lee
 * el mismo envase decenas de veces por segundo, así que sin esta ventana una
 * sola gaseosa entraría al carrito cincuenta veces. Es lo bastante corta como
 * para poder escanear dos unidades iguales una atrás de la otra.
 */
const ESPERA_MISMO_CODIGO = 1500

/**
 * Las aperturas de cámara se hacen de a una y cerrando siempre la anterior.
 *
 * Si dos se piden a la vez —React monta el componente dos veces seguidas en
 * desarrollo, o se cambia de pantalla rápido— la mayoría de las cámaras
 * quedan inutilizables y devuelven NotFoundError hasta reiniciar la app.
 */
let cadena: Promise<unknown> = Promise.resolve()
let streamActivo: MediaStream | null = null

function abrirCamara(): Promise<MediaStream> {
  const tarea = cadena.then(
    async () => {
      cerrarStreamActivo()
      streamActivo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      return streamActivo
    },
    async () => {
      // Que la apertura anterior haya fallado no debe impedir esta.
      cerrarStreamActivo()
      streamActivo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      return streamActivo
    },
  )
  cadena = tarea.catch(() => {})
  return tarea
}

function cerrarStreamActivo(): void {
  streamActivo?.getTracks().forEach((t) => t.stop())
  streamActivo = null
}

/**
 * Enciende la cámara trasera y avisa por `alLeer` cada vez que reconoce un código.
 *
 * Usa el BarcodeDetector del sistema cuando está disponible (Android Chrome),
 * que es mucho más rápido y gasta menos batería, y cae a ZXing por software
 * en el resto de los navegadores.
 */
export async function iniciarEscaneo(
  video: HTMLVideoElement,
  alLeer: (codigo: string) => void,
): Promise<Escaneo> {
  const stream = await abrirCamara()

  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  await video.play()

  let cancelado = false
  let pausado = false
  let frame = 0
  let controles: { stop: () => void } | undefined
  let ultimoCodigo = ''
  let ultimoMomento = 0

  const detener = () => {
    cancelado = true
    if (frame) cancelAnimationFrame(frame)
    controles?.stop()
    stream.getTracks().forEach((t) => t.stop())
    if (streamActivo === stream) streamActivo = null
    // Solo se limpia el video si sigue mostrando este stream. Cuando dos
    // escaneos se solapan —el componente se monta dos veces seguidas, o se
    // cambia de pestaña rápido— el que se apaga tarde borraría el stream del
    // que quedó activo y la pantalla se vería negra para siempre.
    if (video.srcObject === stream) video.srcObject = null
  }

  const pausar = () => {
    pausado = true
  }

  // Al reanudar se olvida el último código para que el mismo producto que
  // acaba de cargarse por teclado pueda volver a escanearse enseguida.
  const reanudar = () => {
    pausado = false
    ultimoCodigo = ''
  }

  const emitir = (codigo: string) => {
    if (pausado || cancelado) return
    const ahora = Date.now()
    if (codigo === ultimoCodigo && ahora - ultimoMomento < ESPERA_MISMO_CODIGO) return
    ultimoCodigo = codigo
    ultimoMomento = ahora
    alLeer(codigo)
  }

  const nativo = await crearDetectorNativo()

  if (nativo) {
    // Un intento cada ~120ms alcanza de sobra y deja respirar al hilo principal.
    let ultimo = 0
    const revisar = async (t: number) => {
      if (cancelado) return
      if (!pausado && t - ultimo > 120 && video.readyState >= 2) {
        ultimo = t
        try {
          const codigos = await nativo.detect(video)
          if (codigos[0]?.rawValue) emitir(codigos[0].rawValue)
        } catch {
          // Un frame que no se pudo leer no es un error: se reintenta al siguiente.
        }
      }
      if (!cancelado) frame = requestAnimationFrame(revisar)
    }
    frame = requestAnimationFrame(revisar)
    return { detener, pausar, reanudar }
  }

  // ZXing solo se descarga si el navegador no trae detector propio: son
  // cientos de kilobytes que Android Chrome nunca necesita.
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])

  // Limitar los formatos a los que aparecen en una tienda acelera bastante
  // la decodificación por software.
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
  ])
  const lector = new BrowserMultiFormatReader(hints)

  controles = await lector.decodeFromVideoElement(video, (resultado) => {
    if (resultado) emitir(resultado.getText())
  })

  return { detener, pausar, reanudar }
}

async function crearDetectorNativo(): Promise<DetectorNativo | null> {
  if (!window.BarcodeDetector) return null
  try {
    const soportados = (await window.BarcodeDetector.getSupportedFormats?.()) ?? []
    const formats = NOMBRES_NATIVOS.filter((f) => soportados.includes(f))
    if (formats.length === 0) return null
    return new window.BarcodeDetector({ formats })
  } catch {
    return null
  }
}

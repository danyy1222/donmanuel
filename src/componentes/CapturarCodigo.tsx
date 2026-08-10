import { useState } from 'react'
import { db } from '../db/db'
import { Hoja } from './UI'
import { VisorCamara } from './VisorCamara'

interface Props {
  abierto: boolean
  onCerrar: () => void
  onCodigo: (codigo: string) => void
  /** Producto que se está editando, para no avisar que choca consigo mismo. */
  productoId?: number
}

/**
 * Captura un código de barras con la cámara para el alta de un producto.
 * Escribir a mano un EAN de 13 dígitos es lento y se presta a errores que
 * después hacen que el producto no aparezca al escanearlo en la caja.
 */
export function CapturarCodigo({ abierto, onCerrar, onCodigo, productoId }: Props) {
  const [duplicado, setDuplicado] = useState('')

  const alLeer = async (codigo: string) => {
    // Dos productos con el mismo código romperían la venta: al escanear en la
    // caja aparecería cualquiera de los dos.
    const otro = await db.productos.where('codigoBarras').equals(codigo).first()
    if (otro && otro.id !== productoId) {
      setDuplicado(`Ese código ya es de "${otro.nombre}"`)
      return
    }
    setDuplicado('')
    onCodigo(codigo)
    onCerrar()
  }

  return (
    <Hoja
      abierta={abierto}
      onCerrar={() => {
        setDuplicado('')
        onCerrar()
      }}
      titulo="Escanear código"
    >
      <div className="p-4">
        <div className="overflow-hidden rounded-2xl">
          {/* Solo se monta con la hoja abierta: la cámara no queda prendida de fondo. */}
          {abierto && (
            <VisorCamara
              onCodigo={alLeer}
              pausado={false}
              onSinCamara={(m) => setDuplicado(`${m}. Escribilo a mano.`)}
            />
          )}
        </div>

        {duplicado ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
            {duplicado}
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-slate-500">
            Apunta al código de barras del envase
          </p>
        )}
      </div>
    </Hoja>
  )
}

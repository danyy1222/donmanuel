import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type Producto } from '../db/db'

/**
 * Muestra la foto del producto si tiene una cargada; si no, el emoji; y si no,
 * la inicial del nombre. Las verduras no tienen código de barras y se buscan
 * mirando, así que siempre tiene que haber algo visual.
 *
 * La imagen se pide por separado y solo cuando el producto declara tenerla:
 * así listar productos no arrastra los binarios de todas las fotos.
 */
export function FotoProducto({
  producto,
  className = '',
}: {
  producto: Producto
  className?: string
}) {
  const blob = useLiveQuery(
    async () =>
      producto.tieneFoto && producto.id !== undefined
        ? (await db.fotos.get(producto.id))?.blob
        : undefined,
    [producto.id, producto.tieneFoto],
  )
  const url = useUrlDeBlob(blob)

  if (url) {
    return <img src={url} alt="" loading="lazy" className={`object-cover ${className}`} />
  }

  return (
    <div className={`flex items-center justify-center bg-slate-100 ${className}`}>
      <span className="text-3xl leading-none select-none">
        {producto.emoji || producto.nombre.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

/** Crea una URL temporal para el Blob y la libera cuando cambia o se desmonta. */
export function useUrlDeBlob(blob?: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const nueva = URL.createObjectURL(blob)
    setUrl(nueva)
    return () => URL.revokeObjectURL(nueva)
  }, [blob])

  return url
}

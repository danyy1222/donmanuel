import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Boton, Campo, Hoja, Vacio } from '../componentes/UI'
import { db, type Categoria } from '../db/db'

/** Paleta fija: elegir de una lista es más rápido en el mostrador que un selector libre. */
const COLORES = [
  '#16a34a', // verde
  '#ea580c', // naranja
  '#2563eb', // azul
  '#0891b2', // celeste
  '#7c3aed', // violeta
  '#db2777', // rosa
  '#ca8a04', // mostaza
  '#dc2626', // rojo
  '#475569', // gris
]

interface Props {
  abierto: boolean
  onCerrar: () => void
  onAviso: (t: string) => void
}

export function Categorias({ abierto, onCerrar, onAviso }: Props) {
  const [editando, setEditando] = useState<Categoria | 'nueva' | null>(null)

  const categorias = useLiveQuery(() => db.categorias.orderBy('orden').toArray(), [], [])
  const productos = useLiveQuery(() => db.productos.where('activo').equals(1).toArray(), [], [])

  const cuantos = (categoriaId?: number) =>
    productos.filter((p) => p.categoriaId === categoriaId).length

  /**
   * Intercambia el orden con la categoría vecina. Botones y no arrastrar:
   * arrastrar dentro de una hoja que ya scrollea se pelea con el gesto.
   */
  const mover = async (indice: number, direccion: -1 | 1) => {
    const actual = categorias[indice]
    const vecina = categorias[indice + direccion]
    if (!actual || !vecina) return
    await db.transaction('rw', db.categorias, async () => {
      await db.categorias.update(actual.id!, { orden: vecina.orden })
      await db.categorias.update(vecina.id!, { orden: actual.orden })
    })
  }

  return (
    <Hoja abierta={abierto} onCerrar={onCerrar} titulo="Categorías" alta>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Ordenan los productos en la pantalla de venta.
          </p>
          <button
            onClick={() => setEditando('nueva')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-600 text-2xl text-white active:bg-marca-700"
            aria-label="Nueva categoría"
          >
            +
          </button>
        </div>

        {categorias.length === 0 ? (
          <Vacio icono="🏷️" texto="No hay categorías. Crea la primera con el botón +." />
        ) : (
          <div className="space-y-2">
            {categorias.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
              >
                <button
                  onClick={() => setEditando(c)}
                  className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
                >
                  <span
                    className="h-9 w-9 shrink-0 rounded-lg"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.nombre}</div>
                    <div className="text-xs text-slate-500">
                      {cuantos(c.id)} producto{cuantos(c.id) === 1 ? '' : 's'}
                    </div>
                  </div>
                </button>

                <div className="flex shrink-0 flex-col">
                  <button
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    className="flex h-7 w-8 items-center justify-center rounded text-slate-500 active:bg-slate-100 disabled:opacity-25"
                    aria-label={`Subir ${c.nombre}`}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => mover(i, 1)}
                    disabled={i === categorias.length - 1}
                    className="flex h-7 w-8 items-center justify-center rounded text-slate-500 active:bg-slate-100 disabled:opacity-25"
                    aria-label={`Bajar ${c.nombre}`}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditorCategoria
        key={editando === 'nueva' ? 'nueva' : (editando?.id ?? 'ninguna')}
        objetivo={editando}
        categorias={categorias}
        cuantosProductos={editando && editando !== 'nueva' ? cuantos(editando.id) : 0}
        onCerrar={() => setEditando(null)}
        onAviso={onAviso}
      />
    </Hoja>
  )
}

function EditorCategoria({
  objetivo,
  categorias,
  cuantosProductos,
  onCerrar,
  onAviso,
}: {
  objetivo: Categoria | 'nueva' | null
  categorias: Categoria[]
  cuantosProductos: number
  onCerrar: () => void
  onAviso: (t: string) => void
}) {
  const esNueva = objetivo === 'nueva'
  const categoria = esNueva ? null : objetivo

  const [nombre, setNombre] = useState(categoria?.nombre ?? '')
  const [color, setColor] = useState(categoria?.color ?? COLORES[0])
  const [error, setError] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [destino, setDestino] = useState<number | ''>('')

  if (!objetivo) return null

  const otras = categorias.filter((c) => c.id !== categoria?.id)

  const guardar = async () => {
    const limpio = nombre.trim()
    if (limpio.length < 2) return setError('Escribe un nombre')

    const repetida = categorias.some(
      (c) => c.id !== categoria?.id && c.nombre.toLowerCase() === limpio.toLowerCase(),
    )
    if (repetida) return setError('Ya existe una categoría con ese nombre')

    if (esNueva) {
      const ultimo = categorias.at(-1)?.orden ?? 0
      await db.categorias.add({ nombre: limpio, color, orden: ultimo + 1 })
      onAviso(`Categoría "${limpio}" creada`)
    } else {
      await db.categorias.update(categoria!.id!, { nombre: limpio, color })
      onAviso('Categoría guardada')
    }
    onCerrar()
  }

  const eliminar = async () => {
    const id = categoria!.id!

    // Sin categorías no se puede dar de alta ningún producto.
    if (categorias.length === 1) {
      return setError('Es la única categoría. Crea otra antes de borrar esta.')
    }

    // Los productos no se borran junto con la categoría: se mudan a la que se
    // elija, porque si no quedarían huérfanos y no aparecerían en ninguna vista.
    if (cuantosProductos > 0) {
      if (destino === '') return setError('Elige a qué categoría pasan los productos')
      await db.transaction('rw', db.productos, db.categorias, async () => {
        await db.productos.where('categoriaId').equals(id).modify({ categoriaId: destino })
        await db.categorias.delete(id)
      })
      onAviso(`Categoría borrada y ${cuantosProductos} producto(s) movidos`)
    } else {
      await db.categorias.delete(id)
      onAviso('Categoría borrada')
    }
    onCerrar()
  }

  return (
    <Hoja
      abierta
      onCerrar={onCerrar}
      titulo={esNueva ? 'Nueva categoría' : 'Editar categoría'}
    >
      <div className="space-y-4 p-4">
        <Campo etiqueta="Nombre" valor={nombre} onCambio={setNombre} requerido placeholder="Lácteos" />

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-600">Color</span>
          <div className="flex flex-wrap gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-11 w-11 rounded-xl transition-transform ${
                  color === c ? 'scale-110 ring-2 ring-slate-900 ring-offset-2' : ''
                }`}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <Boton onClick={guardar} className="w-full text-lg">
          Guardar
        </Boton>

        {!esNueva && (
          <>
            {!borrando ? (
              <Boton
                tipo="fantasma"
                onClick={() => {
                  setError('')
                  setBorrando(true)
                }}
                className="w-full text-red-600"
              >
                Borrar categoría
              </Boton>
            ) : (
              <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
                {cuantosProductos > 0 ? (
                  <>
                    <p className="text-sm text-red-800">
                      Tiene <strong>{cuantosProductos} producto(s)</strong>. ¿A qué categoría
                      pasan?
                    </p>
                    <select
                      value={destino}
                      onChange={(e) => setDestino(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                    >
                      <option value="">Elegir categoría...</option>
                      {otras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <p className="text-sm text-red-800">
                    No tiene productos. Se puede borrar sin problema.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Boton tipo="secundario" onClick={() => setBorrando(false)}>
                    Cancelar
                  </Boton>
                  <Boton tipo="peligro" onClick={eliminar}>
                    Borrar
                  </Boton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Hoja>
  )
}

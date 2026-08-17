import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Boton, Campo, CampoNumero, Hoja, Pestañas, Vacio } from '../componentes/UI'
import { db } from '../db/db'
import { abrirCaja, anotarMovimiento, cajaAbierta, cerrarCaja, resumenCaja } from '../lib/caja'
import { fechaCorta, plata, SIMBOLO } from '../lib/formato'
import { nombreMetodo } from '../lib/pagos'
import { puede, type Sesion } from '../lib/usuarios'
import { Reportes } from './Reportes'

interface Props {
  sesion: Sesion
  onAviso: (t: string) => void
}

export function Caja({ sesion, onAviso }: Props) {
  const [vista, setVista] = useState<'turno' | 'reportes'>('turno')

  // El cajero abre y cierra su turno, pero los reportes son del dueño.
  if (!puede(sesion, 'verReportes')) return <Turno sesion={sesion} onAviso={onAviso} />

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 pt-3">
        <Pestañas
          valor={vista}
          onCambio={setVista}
          opciones={[
            { id: 'turno', etiqueta: '💰 Turno' },
            { id: 'reportes', etiqueta: '📊 Reportes' },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {vista === 'turno' ? <Turno sesion={sesion} onAviso={onAviso} /> : <Reportes />}
      </div>
    </div>
  )
}

function Turno({ sesion, onAviso }: Props) {
  // `null` es "no hay caja abierta" y `undefined` es "todavía cargando": sin
  // distinguirlos, la pantalla parpadea mostrando el botón de abrir caja
  // durante un instante aunque el turno ya esté abierto.
  const turno = useLiveQuery(async () => (await cajaAbierta()) ?? null, [], undefined)
  const datos = useLiveQuery(
    async () => (turno ? await resumenCaja(turno.id!) : null),
    [turno?.id],
    null,
  )
  const movimientos = useLiveQuery(
    async () => (turno ? await db.movCaja.where('cajaId').equals(turno.id!).toArray() : []),
    [turno?.id],
    [],
  )

  const [abriendo, setAbriendo] = useState(false)
  const [anotando, setAnotando] = useState<'ingreso' | 'egreso' | null>(null)
  const [cerrando, setCerrando] = useState(false)

  /**
   * Al cajero se le ocultan los totales del turno. No es desconfianza suelta:
   * es cómo se hace el arqueo en cualquier caja. Si quien cuenta la plata ve
   * antes cuánto tendría que haber, contar deja de detectar faltantes.
   */
  const verNumeros = puede(sesion, 'verReportes')

  if (turno === undefined) return null

  if (!turno) {
    return (
      <div className="p-4">
        <Vacio icono="🔒" texto="La caja está cerrada" />
        <p className="mb-4 text-center text-sm text-slate-500">
          Abrí la caja al empezar el día con la plata que dejás para dar vuelto. Las ventas que
          hagas sin caja abierta se registran igual, pero quedan afuera del arqueo.
        </p>
        <Boton onClick={() => setAbriendo(true)} className="w-full text-lg">
          Abrir caja
        </Boton>

        {verNumeros && <UltimosCierres />}

        <AbrirCaja
          abierto={abriendo}
          onCerrar={() => setAbriendo(false)}
          onAbrir={async (monto) => {
            await abrirCaja(monto, sesion.usuario.nombre)
            setAbriendo(false)
            onAviso('Caja abierta')
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-xl bg-marca-600 px-4 py-5 text-center text-white">
        {verNumeros ? (
          <>
            <div className="text-sm opacity-80">En el cajón tendría que haber</div>
            <div className="text-4xl font-bold tabular-nums">{plata(datos?.esperado ?? 0)}</div>
          </>
        ) : (
          <>
            <div className="text-4xl">🔓</div>
            <div className="mt-2 text-lg font-bold">Caja abierta</div>
          </>
        )}
        <div className="mt-1 text-xs opacity-70">
          Abierta {fechaCorta(turno.abierta)} por {turno.abiertaPor}
        </div>
      </section>

      {verNumeros && (
        <>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold">Cómo se llegó a ese número</h2>
        <div className="divide-y divide-slate-100 text-sm">
          <Linea texto="Con lo que abriste" monto={turno.montoInicial} />
          <Linea
            texto={`Ventas en efectivo${datos?.ventas ? ` (${datos.ventas} ventas en total)` : ''}`}
            monto={datos?.efectivo ?? 0}
          />
          {(datos?.ingresos ?? 0) > 0 && <Linea texto="Otros ingresos" monto={datos!.ingresos} />}
          {(datos?.egresos ?? 0) > 0 && <Linea texto="Egresos" monto={-datos!.egresos} />}
          <div className="flex justify-between pt-2 font-bold">
            <span>Esperado en el cajón</span>
            <span className="tabular-nums">{plata(datos?.esperado ?? 0)}</span>
          </div>
        </div>
      </section>

      {/*
        Lo digital va aparte y no sumado: esa plata está en la cuenta del banco,
        no en el cajón. Meterla en el total es el error que hace que al contar
        siempre parezca que falta.
      */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 font-bold">Cobrado sin efectivo</h2>
        <p className="mb-3 text-sm text-slate-500">
          Esto no está en el cajón. Revisá que coincida con lo que te llegó al celular.
        </p>
        {datos && datos.digital.length > 0 ? (
          <div className="divide-y divide-slate-100 text-sm">
            {datos.digital.map((d) => (
              <Linea key={d.metodo} texto={nombreMetodo(d.metodo)} monto={d.monto} />
            ))}
            <div className="flex justify-between pt-2 font-bold">
              <span>Total</span>
              <span className="tabular-nums">{plata(datos.totalDigital)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Todavía no hubo cobros por Yape, Plin ni tarjeta.</p>
        )}
      </section>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Boton tipo="secundario" onClick={() => setAnotando('ingreso')}>
          ➕ Ingreso
        </Boton>
        <Boton tipo="secundario" onClick={() => setAnotando('egreso')}>
          ➖ Egreso
        </Boton>
      </div>

      {movimientos.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-bold">Movimientos del turno</h2>
          <div className="divide-y divide-slate-100 text-sm">
            {[...movimientos].reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-slate-600">{m.motivo}</span>
                <span
                  className={`shrink-0 font-semibold tabular-nums ${
                    m.tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  {m.tipo === 'ingreso' ? '+' : '−'}
                  {plata(m.monto)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Boton tipo="peligro" onClick={() => setCerrando(true)} className="w-full text-lg">
        Cerrar caja y contar
      </Boton>

      <AnotarMovimiento
        tipo={anotando}
        onCerrar={() => setAnotando(null)}
        onGuardar={async (monto, motivo) => {
          await anotarMovimiento(turno.id!, anotando!, monto, motivo, sesion.usuario.nombre)
          setAnotando(null)
          onAviso(anotando === 'ingreso' ? 'Ingreso anotado' : 'Egreso anotado')
        }}
      />

      <CerrarCaja
        abierto={cerrando}
        esperado={datos?.esperado ?? 0}
        verDiferencia={verNumeros}
        onCerrar={() => setCerrando(false)}
        onConfirmar={async (contado) => {
          const diferencia = await cerrarCaja(turno.id!, contado, sesion.usuario.nombre)
          setCerrando(false)
          if (!verNumeros) return onAviso('Caja cerrada')
          onAviso(
            diferencia === 0
              ? 'Caja cerrada, cuadra justo'
              : diferencia > 0
                ? `Caja cerrada, sobran ${plata(diferencia)}`
                : `Caja cerrada, faltan ${plata(-diferencia)}`,
          )
        }}
      />
    </div>
  )
}

function AbrirCaja({
  abierto,
  onCerrar,
  onAbrir,
}: {
  abierto: boolean
  onCerrar: () => void
  onAbrir: (monto: number) => void
}) {
  const [monto, setMonto] = useState(0)

  return (
    <Hoja abierta={abierto} onCerrar={onCerrar} titulo="Abrir caja">
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-500">
          Cuánta plata dejás en el cajón para empezar a dar vuelto.
        </p>
        <CampoNumero
          etiqueta="Monto inicial"
          valor={monto}
          onCambio={setMonto}
          prefijo={SIMBOLO}
          placeholder="0"
        />
        <Boton onClick={() => onAbrir(monto)} className="w-full text-lg">
          Abrir con {plata(monto)}
        </Boton>
      </div>
    </Hoja>
  )
}

function AnotarMovimiento({
  tipo,
  onCerrar,
  onGuardar,
}: {
  tipo: 'ingreso' | 'egreso' | null
  onCerrar: () => void
  onGuardar: (monto: number, motivo: string) => void
}) {
  const [monto, setMonto] = useState(0)
  const [motivo, setMotivo] = useState('')

  const cerrar = () => {
    setMonto(0)
    setMotivo('')
    onCerrar()
  }

  return (
    <Hoja
      abierta={tipo !== null}
      onCerrar={cerrar}
      titulo={tipo === 'ingreso' ? 'Anotar ingreso' : 'Anotar egreso'}
    >
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-500">
          {tipo === 'ingreso'
            ? 'Plata que entra al cajón sin ser una venta.'
            : 'Plata que sale del cajón: pagar el flete, comprar algo, retirar.'}
        </p>
        <CampoNumero
          etiqueta="Monto"
          valor={monto}
          onCambio={setMonto}
          prefijo={SIMBOLO}
          placeholder="0"
        />
        <Campo
          etiqueta="Motivo"
          valor={motivo}
          onCambio={setMotivo}
          placeholder={tipo === 'ingreso' ? 'Vuelto de la mañana' : 'Flete del mercado'}
          requerido
        />
        <Boton
          onClick={() => onGuardar(monto, motivo.trim())}
          disabled={monto <= 0 || motivo.trim() === ''}
          className="w-full text-lg"
        >
          Anotar
        </Boton>
      </div>
    </Hoja>
  )
}

/**
 * El arqueo. Se pide contar la plata **antes** de mostrar la diferencia: si se
 * viera el número esperado al lado del campo, contar deja de servir para
 * detectar faltantes porque el ojo lo completa solo.
 */
function CerrarCaja({
  abierto,
  esperado,
  verDiferencia: puedeVer,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean
  esperado: number
  /** El cajero cuenta y cierra, pero el resultado del arqueo lo ve el dueño. */
  verDiferencia: boolean
  onCerrar: () => void
  onConfirmar: (contado: number) => void
}) {
  const [contado, setContado] = useState(0)
  const [verDiferencia, setVerDiferencia] = useState(false)

  const cerrar = () => {
    setContado(0)
    setVerDiferencia(false)
    onCerrar()
  }

  const diferencia = Math.round((contado - esperado) * 100) / 100

  return (
    <Hoja abierta={abierto} onCerrar={cerrar} titulo="Cerrar caja">
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-500">
          Contá toda la plata del cajón y escribí cuánto hay. Recién después vas a ver si cuadra.
        </p>

        <CampoNumero
          etiqueta="Plata contada"
          valor={contado}
          onCambio={(n) => {
            setContado(n)
            setVerDiferencia(false)
          }}
          prefijo={SIMBOLO}
          placeholder="0"
        />

        {!puedeVer ? (
          <Boton
            tipo="peligro"
            onClick={() => onConfirmar(contado)}
            disabled={contado <= 0}
            className="w-full text-lg"
          >
            Cerrar el turno con {plata(contado)}
          </Boton>
        ) : verDiferencia ? (
          <>
            <div
              className={`rounded-xl px-4 py-5 text-center ${
                diferencia === 0
                  ? 'bg-green-50 text-green-800'
                  : diferencia > 0
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-red-50 text-red-700'
              }`}
            >
              <div className="text-sm opacity-80">
                {diferencia === 0 ? 'Cuadra justo' : diferencia > 0 ? 'Sobra' : 'Falta'}
              </div>
              <div className="text-3xl font-bold tabular-nums">{plata(Math.abs(diferencia))}</div>
              <div className="mt-2 text-xs opacity-70">
                Esperado {plata(esperado)} · Contado {plata(contado)}
              </div>
            </div>

            <Boton tipo="peligro" onClick={() => onConfirmar(contado)} className="w-full text-lg">
              Cerrar el turno
            </Boton>
          </>
        ) : (
          <Boton
            onClick={() => setVerDiferencia(true)}
            disabled={contado <= 0}
            className="w-full text-lg"
          >
            Ver si cuadra
          </Boton>
        )}
      </div>
    </Hoja>
  )
}

function UltimosCierres() {
  const cerradas = useLiveQuery(
    async () => (await db.caja.where('estado').equals('cerrada').toArray()).slice(-8).reverse(),
    [],
    [],
  )

  if (cerradas.length === 0) return null

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-bold">Últimos cierres</h2>
      <div className="divide-y divide-slate-100 text-sm">
        {cerradas.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-2">
            <span className="text-slate-500">
              {fechaCorta(c.abierta)} · {c.cerradaPor ?? c.abiertaPor}
            </span>
            <span className="text-right">
              <span className="font-semibold tabular-nums">{plata(c.contado ?? 0)}</span>
              {c.diferencia !== undefined && c.diferencia !== 0 && (
                <span
                  className={`ml-2 text-xs font-semibold ${
                    c.diferencia > 0 ? 'text-amber-600' : 'text-red-600'
                  }`}
                >
                  {c.diferencia > 0 ? '+' : '−'}
                  {plata(Math.abs(c.diferencia))}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Linea({ texto, monto }: { texto: string; monto: number }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-slate-600">{texto}</span>
      <span className="tabular-nums">{plata(monto)}</span>
    </div>
  )
}

# Tienda Don Manuel

Punto de venta para verdulería y abarrotes, hecho para usarse **desde el
celular**. Funciona sin internet: los datos se guardan dentro del propio
teléfono.

Configurado para **Perú**: soles con dos decimales, punto como separador
decimal, sugerencias de pago con los billetes locales y productos de ejemplo
con nombres y precios de mercado peruano.

## Cómo probarlo ahora

```bash
npm install
npm run dev
```

Se abre en `http://localhost:5173`. La consola también muestra una dirección
tipo `http://192.168.1.42:5173`: esa es la que tenés que abrir **desde el
celular**, con el teléfono conectado al mismo wifi que la computadora.

Viene con productos de ejemplo cargados (verduras, frutas, abarrotes, bebidas y
limpieza) para poder probarlo sin cargar nada.

## Instalarlo en el celular (APK de Android)

```bash
npm run apk
```

Deja el archivo **`sistema-tienda.apk`** en la carpeta del proyecto. Pasalo al
celular (cable, WhatsApp, Drive, lo que sea), abrilo y aceptá instalar.

La primera vez Android va a avisar que la app viene de un origen desconocido:
hay que darle **Instalar de todas formas**. Es normal en apps que no vienen de
Play Store; pasa porque el APK está firmado con la clave de desarrollo.

Instalada así funciona **todo sin internet**, incluido el escáner de la cámara.

### App de pruebas, separada de la de la tienda

```bash
npm run apk:pruebas
```

Deja **`don-manuel-pruebas.apk`**, que es **otra app para Android**, no una versión
distinta de la misma:

| | App de la tienda | App de pruebas |
|---|---|---|
| Identificador | `com.tienda.sistema` | `com.tienda.sistema.pruebas` |
| Nombre en el celular | Tienda Don Manuel | **Don Manuel PRUEBAS** |
| Base de datos | La de la tienda | Propia y vacía |
| Busca actualizaciones | Sí | **No** |

Las dos conviven en el mismo celular. Android separa el almacenamiento por
identificador, así que la de pruebas arranca vacía y **no puede tocar los
productos ni las ventas de la tienda**, ni instalándose ni desinstalándose.

La de pruebas lleva una cinta amarilla arriba que dice *PRUEBAS*, porque las dos
apps se parecen y vender de verdad dentro de la equivocada sería un lío para
desarmar.

**No busca actualizaciones a propósito.** No es que esté configurada para no
hacerlo: el compilador elimina ese código del paquete, así que el canal de
pruebas no tiene forma de llegar a los celulares de la tienda. Se instala a
mano, en el celular de prueba, y ahí se queda.

Para probar con tus productos de verdad: exportá el respaldo desde la app de la
tienda e importalo en la de pruebas.

### Requisitos para generar el APK

Las herramientas de Android viven fuera del proyecto, en
`C:\Users\PC\android-build` (JDK 21 + Android SDK, sin Android Studio). Si las
movés de lugar, actualizá las rutas en [scripts/apk.ps1](scripts/apk.ps1) y en
`android/local.properties`.

### Usarlo como página web

También sigue siendo una PWA. `npm run build` genera `dist/`, que son archivos
estáticos publicables en cualquier hosting. Para que ande la cámara hace falta
HTTPS: los navegadores solo la habilitan en `localhost` o con certificado.

## Qué hace

### Entrar
Login con **PIN de 4 números**. Dos roles:

| | Dueño | Cajero |
|---|---|---|
| Vender y crear boletas | ✅ | ✅ |
| Abrir y cerrar su turno de caja | ✅ | ✅ |
| Ver los totales de caja y el arqueo | ✅ | — |
| Ver precios de costo, ganancias y reportes | ✅ | — |
| Editar productos, precios y stock | ✅ | — |
| Configuración, usuarios y respaldo | ✅ | — |

La primera vez que se abre, la app pide crear el usuario dueño. La sesión queda
abierta aunque se cierre la app. Cada venta guarda quién la hizo.

El PIN se guarda como SHA-256 con sal, nunca en texto plano. No es defensa
contra alguien que se lleve el celular —4 dígitos se prueban en segundos— pero
evita lo que sí pasa en una tienda: que un empleado abra la base y lea el PIN
del dueño.

### Vender
- **La cámara arranca sola al abrir**: se apunta al código y el producto entra
  a la lista, sin tocar nada.
- Un mismo código se ignora durante 1,5 segundos, para que la cámara no cargue
  cincuenta veces el mismo envase pero sí se puedan escanear dos unidades iguales.
- Botón **Sin código** para las verduras: búsqueda por nombre (sin tildes,
  "morron" encuentra "Morrón") y botonera con fotos o emoji. La cámara queda
  prendida por detrás, así alternar es instantáneo.
- **Venta por peso**: tecleás `0,750` kg y calcula el precio.
- **Venta por plata**: el cliente pide "$500 de papa" y el sistema dice cuánto pesar.
- Carrito editable y descuentos.
- Cobro en **efectivo, Yape, Plin, tarjeta o transferencia**. Yape y Plin van
  separados y no metidos dentro de "transferencia": son la forma de cobro más
  usada en las bodegas peruanas, cada uno cae en una cuenta distinta, y
  mezclarlos hace imposible cuadrar la caja.
- Al cobrar por Yape o Plin **se muestra tu QR en pantalla** para que el cliente
  lo escanee, con el monto grande al lado. Es la forma que no cobra comisión.
- Sugerencias de con cuánto paga el cliente y cálculo del vuelto.
- Descuenta el stock automáticamente y lo deja anotado en el historial.

### Caja
- **Apertura** con el monto que dejás para dar vuelto.
- **Ingresos y egresos** que no son ventas: pagar el flete, sacar plata.
- **Cierre con arqueo**: contás la plata del cajón, escribís cuánto hay y recién
  ahí el sistema dice si falta o sobra. El número esperado aparece después de
  contar a propósito; si se viera antes, contar dejaría de detectar faltantes.
- Lo cobrado por Yape, Plin y tarjeta se muestra **aparte y no suma al cajón**:
  esa plata está en la cuenta, no en la caja. Sumarla es el error que hace que
  al arquear siempre parezca que falta.
- El cajero abre y cierra su turno pero no ve los totales ni la diferencia.

### Reportes
Del día, de 7 días o de 30:

- Vendido y **ganancia real** (venta menos costo menos merma), no facturación.
- Cómo te pagaron, con cada método por separado.
- Lo que más se vende y lo que se perdió en merma.
- A qué hora se vende, para saber cuándo conviene tener más gente.

El costo se **congela en cada venta**: la ganancia de una venta vieja no cambia
porque hoy el proveedor aumentó.

### Stock
Dentro de Productos, en la pestaña **Stock**:

- **Entrada** de mercadería cuando llega del proveedor.
- **Merma** —lo que se pudre, se seca o se cae— con motivo y valorizada en plata.
  Sin esto los números de una verdulería no cierran nunca.
- **Conteo**: contás lo que hay de verdad y el sistema anota la diferencia.
- **Lo que se está acabando**, arriba de todo: es la pregunta real al abrir esa
  pantalla, qué hay que comprar mañana.
- Historial completo: cada entrada y salida, con quién la hizo y por qué.

### Boletas
La boleta **no se genera sola**. Solo cuando el cliente la pide y tocás
**Crear boleta**, así no se llena el celular de PDF que nadie usa.

- Numeración correlativa (`BOL-0001`, `BOL-0002`...).
- Dos formatos: ticket angosto (se lee en el celular) y A4 (para imprimir).
- **Guardar** el PDF en el teléfono, **enviar por WhatsApp** o **ver**.
- Historial: toda boleta creada se puede reenviar a otro número sin rehacerla.

Sobre el envío: WhatsApp no permite que una app mande mensajes sola sin pasar
por la API oficial de Meta (que necesita servidor propio y cuenta de empresa).
El sistema deja la boleta adjunta y el mensaje escrito; el envío lo confirma la
persona con un toque.

### Productos
Alta y edición, precio de venta y de costo con cálculo de ganancia y margen,
stock con aviso de faltante, foto o emoji, y baja lógica (no se borra, para no
romper las ventas viejas). Solo el dueño.

El **código de barras se carga escaneando** con la cámara, no tipeando 13
dígitos a mano. Si ese código ya pertenece a otro producto, avisa: dos
productos con el mismo código harían que la caja cargue cualquiera de los dos.

### Ajustes
Datos de la tienda para el encabezado de las boletas, **QR de cobro de Yape y
Plin**, gestión de usuarios, últimas ventas con su vendedor, y
**exportar / importar respaldo**. Solo el dueño.

> Los datos viven dentro del celular. Si se pierde o se formatea sin respaldo,
> se pierde todo. Exportá seguido: es el riesgo real de esta arquitectura.

## Cómo está armado

| Pieza | Herramienta |
|---|---|
| Interfaz | React 19 + TypeScript + Vite |
| Estilos | Tailwind CSS 4 |
| Base de datos | Dexie (IndexedDB), dentro del teléfono |
| App instalable | vite-plugin-pwa, funciona offline |
| Código de barras | BarcodeDetector del sistema, con ZXing de respaldo |
| Boletas PDF | jsPDF + jspdf-autotable |

jsPDF y ZXing se descargan **solo cuando se usan**. El arranque pesa 335 KB en
vez de 1,2 MB, que en el mostrador con señal mala se nota.

### Decisiones de rendimiento

Todo lo pesado vive fuera de las tablas que se listan:

- **Fotos y PDF en tablas aparte** (`fotos`, `pdfs`). Antes iban dentro de cada
  producto y cada boleta, así que listar productos levantaba todas las imágenes
  a memoria solo para dibujar miniaturas de 64 píxeles. Con 200 productos con
  foto, la lista pasó de ~8 MB a 0.
- **Las fotos se achican a 480px antes de guardarlas.** La cámara de un celular
  saca 3 MB; guardadas así quedan en unos 40 KB.
- **Las consultas van por índice.** El resumen del día usa el índice de fecha en
  vez de traer el historial entero: con 2.000 ventas, 3 ms en lugar de 20, y la
  diferencia crece con cada mes de uso.

```
src/
  db/          esquema de datos y productos de ejemplo
  lib/         plata y peso, escáner, PDF, pagos, caja, stock
  componentes/ piezas compartidas (hoja, teclado, foto, boleta)
  pantallas/   Vender, Cobrar, Caja, Reportes, Productos, Stock,
               Boletas, Ajustes
scripts/
  iconos.mjs   genera los PNG del manifest desde public/icono.svg
  publicar.mjs publica una versión nueva en GitHub
```

La barra de abajo tiene cinco secciones y no ocho: **Caja** contiene el turno y
los reportes, y **Productos** contiene el catálogo y el stock. Con más de cinco
íconos el pulgar empieza a errarle.

## Comprobantes oficiales (SUNAT)

Las boletas que emite la app son **documentos no fiscales**: sirven como
comprobante para el cliente y como registro propio, pero no reemplazan una
boleta de venta oficial.

En [FACTURACION-PERU.md](FACTURACION-PERU.md) está la investigación completa:
qué trámites hacen falta, los cuatro caminos posibles con sus costos, y por qué
el Nuevo RUS **no está obligado** a emitir electrónicamente.

## Lo que todavía no está

Ver [PLAN.md](PLAN.md) para el detalle. En resumen: cambio rápido de precios por
categoría, fiado con cuenta corriente, proveedores y compras, pago mixto,
devoluciones, ventas en espera e impresión en térmica bluetooth.

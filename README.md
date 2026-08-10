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
| Ver precios de costo y ganancias | ✅ | — |
| Editar productos y precios | ✅ | — |
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
- Carrito editable, descuentos, cobro en efectivo, tarjeta o transferencia.
- Sugerencias de con cuánto paga el cliente y cálculo del vuelto.
- Descuenta el stock automáticamente.

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
Datos de la tienda para el encabezado de las boletas, gestión de usuarios,
resumen del día, últimas ventas con su vendedor, y **exportar / importar
respaldo**. Solo el dueño.

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
  lib/         formato de plata y peso, escáner, PDF, compartir, pagos
  componentes/ piezas compartidas (hoja, teclado, foto, boleta)
  pantallas/   Vender, Cobrar, Productos, Boletas, Ajustes
scripts/
  iconos.mjs   genera los PNG del manifest desde public/icono.svg
```

## Comprobantes oficiales (SUNAT)

Las boletas que emite la app son **documentos no fiscales**: sirven como
comprobante para el cliente y como registro propio, pero no reemplazan una
boleta de venta oficial.

En [FACTURACION-PERU.md](FACTURACION-PERU.md) está la investigación completa:
qué trámites hacen falta, los cuatro caminos posibles con sus costos, y por qué
el Nuevo RUS **no está obligado** a emitir electrónicamente.

## Lo que todavía no está

Ver [PLAN.md](PLAN.md) para el detalle. En resumen: merma y ajustes de stock,
apertura y cierre de caja, cambio rápido de precios por categoría, fiado con
cuenta corriente, proveedores y compras, reportes de ganancia e impresión en
térmica bluetooth.

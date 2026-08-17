# Sistema de Tienda — Plan

Sistema de punto de venta para tienda de verduras y almacén, pensado para usarse **desde el celular**.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Plataforma | App para celular Android (APK instalable) |
| Balanza | Balanza aparte, el peso se teclea a mano |
| Comprobante | Ticket simple, no fiscal |
| Boletas PDF | Solo cuando se pide, con un botón. Se guarda en el celular y se manda por WhatsApp |
| Usuarios | Una caja: dueño + empleados, con login por PIN |

---

## 1. Cómo se va a hacer la app de celular

**PWA (aplicación web instalable).** Se abre una vez desde el navegador del celular, se toca "Agregar a pantalla de inicio", y queda con su ícono como cualquier otra app.

Por qué esta opción:

- **Funciona sin internet.** Los datos se guardan en el propio celular. Si se corta la señal, se sigue vendiendo igual.
- **No depende de Play Store.** Nada de revisiones, cuentas de desarrollador ni esperas para publicar.
- **Se actualiza sola.** Cuando arreglo algo, la próxima vez que abran la app ya está actualizado.
- **Usa la cámara del celular** como lector de código de barras, sin comprar hardware.
- **Anda en Android y iPhone** con el mismo código.
- **Si después querés un APK de verdad** (para instalarlo con un archivo, o para usar lector bluetooth con más control), se envuelve este mismo código con Capacitor. No se rehace nada.

### Stack técnico

| Pieza | Herramienta | Para qué |
|---|---|---|
| Base | React + TypeScript + Vite | Interfaz |
| PWA | vite-plugin-pwa | Instalable + funciona offline |
| Datos | Dexie.js sobre IndexedDB | Base de datos dentro del celular |
| Estilos | Tailwind CSS | Botones grandes, pantallas para el pulgar |
| Código de barras | BarcodeDetector API + @zxing/library de respaldo | Escaneo con la cámara |
| Boletas PDF | jsPDF + jspdf-autotable | Armar el PDF dentro del celular, sin servidor |
| Envío | Web Share API (adjunta el PDF) + enlace `wa.me` de respaldo | Mandar la boleta por WhatsApp |
| Ticket | Web Bluetooth (ESC/POS) | Impresora térmica 58mm |
| Respaldo | Export/import de archivo JSON | No perder los datos nunca |

### Reglas de diseño de la interfaz

Esto no es una app de oficina, es para un mostrador:

- Botones grandes: se usa parado, apurado y a veces con las manos mojadas.
- Todo lo de vender se hace con **una sola mano y el pulgar**: los botones importantes van abajo de la pantalla.
- Números grandes y con mucho contraste: se lee de reojo mientras se atiende.
- Cero pantallas de confirmación innecesarias en la venta. La venta tiene que ser rapidísima.
- Modo oscuro y claro, porque una verdulería puede estar a pleno sol o en un pasillo oscuro.

---

## 2. Qué va a saber hacer el sistema

### A. Productos

- Código de barras, código interno corto y nombre.
- Categorías (verduras, frutas, almacén, bebidas, limpieza...).
- **Precio de venta** y **precio de costo** → el sistema calcula solo la ganancia.
- **Tipo de venta:**
  - Por unidad (una lechuga, una gaseosa)
  - Por peso (tomate a $X el kilo)
  - Por atado / bandeja / docena / cajón
- Stock actual y stock mínimo, con aviso cuando se está por acabar.
- **Foto del producto** — clave para las verduras, que no tienen código de barras y se buscan mirando.
- Producto perecedero, con fecha de vencimiento o de ingreso.
- Precio por cantidad ("3 x $1000") y precio por mayor.

### B. Vender (la pantalla principal)

- **Escanear con la cámara** del celular apuntando al código de barras.
- **Buscar escribiendo** el nombre; aparece a la tercera letra.
- **Botonera con fotos** para las verduras, que no se escanean: se toca la foto del tomate y listo.
- Para productos por peso, dos formas de cargar (las dos hacen falta):
  - **Por peso:** peso en la balanza, tecleo `0.750` kg → calcula el precio.
  - **Por plata:** el cliente pide "$500 de papa" → tecleo `$500` y el sistema dice cuánto pesar.
- Carrito editable: cambiar cantidad, sacar un ítem, poner descuento a un producto suelto.
- Descuento sobre el total, en % o en pesos.
- **Formas de cobro:** efectivo, **Yape**, **Plin**, tarjeta, transferencia, **fiado (cuenta corriente)**, y pago mixto (una parte en efectivo, otra por Yape).
- Cálculo automático del vuelto.
- **Venta en espera:** el cliente se olvidó algo y va a buscarlo → se guarda su carrito, se atiende al siguiente, después se retoma.
- Anular venta y hacer devoluciones (devuelve el stock).
- Ticket: imprimir en térmica bluetooth.

### C. Boletas en PDF

**Regla principal: la boleta no se genera sola.** Se crea únicamente cuando alguien la pide y se toca el botón **"Crear boleta"**. Las ventas comunes quedan registradas igual, pero sin PDF. Así no se llena el celular de archivos que nadie usa.

#### Desde dónde se puede crear

1. **Al terminar una venta** — en la pantalla de "venta lista" aparece el botón *Crear boleta*.
2. **Desde el historial de ventas** — el cliente vuelve al otro día y la pide. Se busca la venta y se le genera la boleta ahí.
3. **Boleta suelta** — cargar los ítems a mano, sin que haya una venta atrás. Sirve para cualquier comprobante que haga falta.

#### Qué lleva la boleta

- **Número correlativo** (`BOL-0001`, `BOL-0002`...) que avanza solo cuando se crea una boleta de verdad, así no quedan huecos en la numeración.
- Fecha y hora.
- **Datos de la tienda:** logo, nombre, dirección, teléfono. Se cargan una vez en Configuración.
- **Datos del cliente:** nombre y teléfono. Opcionales documento y dirección. Si el cliente ya está cargado en el sistema, se completa solo.
- **Detalle:** producto, cantidad o peso, precio unitario y subtotal por línea.
- Subtotal, descuento y **total**.
- Forma de pago.
- Al pie, la leyenda **"Documento no fiscal"**, para dejarlo claro.

#### Formato

- Por defecto **formato ticket vertical angosto**: se lee perfecto en la pantalla de un celular sin tener que agrandar, que es donde la va a mirar el cliente.
- Opción **A4** para el que la quiera imprimir en hoja.

#### Qué pasa después de crearla

Al generar el PDF aparecen tres botones:

| Botón | Qué hace |
|---|---|
| **Guardar en el celular** | El PDF va a Descargas, queda como archivo normal. |
| **Enviar por WhatsApp** | Se escribe el número (o se toma de la ficha del cliente si ya está cargado), se abre WhatsApp con el PDF ya adjunto y se toca enviar. |
| **Ver** | Abre el PDF para revisarlo antes de mandarlo. |

Además, **toda boleta creada queda guardada en el historial de la app**. Se puede volver a abrir, guardar de nuevo o reenviar a otro número cuando sea, sin tener que rehacerla.

#### Sobre el envío por WhatsApp

WhatsApp no permite que una app le mande mensajes a alguien sin intervención de la persona, salvo pagando la API oficial de Meta (que además necesita un servidor propio andando siempre y cuenta de empresa verificada).

Entonces el flujo real es: **el sistema deja todo listo y vos tocás enviar**. Se escribe el número, se abre WhatsApp con la boleta adjunta y el mensaje escrito, y sale con un toque. Es gratis, no necesita servidor ni cuenta de empresa, y anda con el WhatsApp que ya usás.

Si algún día el volumen justifica el envío totalmente automático, el código queda preparado para enchufarlo sin rehacer la parte de la boleta ni la del PDF.

### D. Stock

- Entrada de mercadería al recibir del proveedor.
- **Merma** — importante en verduras: lo que se pudre, se seca o se cae se descuenta y queda registrado. Sin esto los números nunca cierran.
- Ajuste manual con motivo.
- Conteo de inventario físico: recorrer y corregir lo que no coincide.
- Historial: para cada producto, todo lo que entró y salió.

### E. Precios rápidos

Las verduras cambian de precio casi todos los días, así que necesita su propia pantalla:

- Cambiar precios de una lista completa en una sola pantalla, sin entrar producto por producto.
- Subir o bajar un % a toda una categoría de una vez.
- Historial de precios, para ver cómo se movió el tomate en el mes.

### F. Clientes y fiado

- Lista de clientes con teléfono.
- **Cuenta corriente:** cuánto debe cada uno, desde cuándo.
- Registrar pagos, totales o parciales.
- Ver todo lo que se llevó un cliente.
- Recordatorio de deuda por WhatsApp.

### G. Proveedores y compras

- Lista de proveedores.
- Registrar la compra: sube el stock y actualiza el costo.
- Cuánto se le debe a cada proveedor.

### H. Caja

- **Apertura de caja** con el monto inicial.
- Ingresos y egresos que no son ventas (pagar un flete, sacar plata, comprar algo).
- **Cierre de caja / arqueo:** el sistema dice cuánto debería haber, se cuenta la plata real y queda registrada la diferencia. Así se detecta si falta.

### I. Reportes

- Ventas del día, semana y mes.
- **Ganancia real** (venta menos costo), no solo facturación.
- Productos más vendidos y los que no se mueven.
- Cuánto se perdió en merma.
- Stock bajo (qué hay que comprar).
- Quiénes deben plata.
- Horarios de más venta, para saber cuándo conviene tener más gente.

### J. Configuración

- Datos y logo de la tienda para el ticket.
- Usuarios con PIN y dos roles:
  - **Dueño:** ve todo, cambia precios, ve ganancias, anula ventas.
  - **Cajero:** solo vende. No ve costos ni ganancias.
- **Respaldo:** exportar toda la base a un archivo para guardar en Drive o mandarse por WhatsApp, y poder restaurarla. Esto se configura desde el día uno, no al final.
- Configuración de impresora.

---

## 3. Modelo de datos

```
productos       id, codigo_barras, codigo_interno, nombre, categoria_id,
                tipo_venta (unidad|peso|atado), precio_venta, precio_costo,
                stock, stock_minimo, foto, perecedero, activo

categorias      id, nombre, color, orden

ventas          id, fecha, usuario_id, cliente_id, subtotal, descuento,
                total, estado (completada|anulada), caja_id

venta_items     id, venta_id, producto_id, nombre, cantidad, peso,
                precio_unit, descuento, subtotal

pagos           id, venta_id, metodo (efectivo|tarjeta|transferencia|fiado),
                monto

boletas         id, numero (BOL-0001), venta_id (puede ser null si es suelta),
                fecha, cliente_nombre, cliente_telefono, cliente_doc,
                cliente_direccion, total, formato (ticket|a4),
                pdf_blob, enviada, enviada_a, fecha_envio

boleta_items    id, boleta_id, nombre, cantidad, peso, precio_unit, subtotal
                (copia congelada: si mañana cambia el precio del producto,
                 la boleta vieja tiene que seguir mostrando lo que se cobró)

clientes        id, nombre, telefono, saldo_deuda, notas

mov_cuenta      id, cliente_id, fecha, tipo (compra|pago), monto, venta_id

proveedores     id, nombre, telefono, saldo_deuda

compras         id, proveedor_id, fecha, total, pagado

compra_items    id, compra_id, producto_id, cantidad, costo_unit

mov_stock       id, producto_id, fecha, tipo (venta|compra|merma|ajuste),
                cantidad, motivo, usuario_id

caja            id, fecha_apertura, fecha_cierre, monto_inicial,
                monto_final_sistema, monto_final_real, diferencia, usuario_id

mov_caja        id, caja_id, fecha, tipo (ingreso|egreso), monto, motivo

usuarios        id, nombre, pin_hash, rol (dueño|cajero), activo

hist_precios    id, producto_id, fecha, precio_anterior, precio_nuevo
```

---

## 4. Orden de trabajo

### ✅ Fase 1 — Vender — HECHA
Productos, categorías, pantalla de venta, escaneo con cámara, búsqueda, botonera con fotos, venta por peso y por plata, cobro en efectivo, ticket.

**Ya se puede usar en la tienda de verdad.** Todo lo demás se agrega encima sin frenar la venta.

### ✅ Fase 2 — Boletas en PDF — HECHA
Botón *Crear boleta*, armado del PDF, numeración correlativa, datos de la tienda en Configuración, guardar en el celular, enviar por WhatsApp e historial de boletas.

Se sumó además el respaldo (exportar/importar), que estaba previsto para la Fase 5: los datos viven en el celular y esperar hasta el final era arriesgado.

### ✅ Cámara como pantalla de entrada — HECHO
La app abre con la cámara escaneando, sin tocar nada, y lo leído cae en la lista con su precio. La vista de productos sin código queda a un toque, porque las verduras no tienen código de barras y sin eso no se podrían vender.

La cámara no se apaga al pasar a la otra vista: solo se oculta y se pausa la lectura. Reabrirla tardaba casi un segundo y en el mostrador se alterna todo el tiempo.

### ✅ Manejo de usuarios — HECHO
Adelantado desde la Fase 5. Login con PIN de 4 números, roles Dueño y Cajero, alta y baja de usuarios, y cada venta guarda quién la hizo. El cajero no ve costos, ganancias, productos ni configuración.

El sistema no deja quedarse sin ningún dueño: ni dándolo de baja ni bajándole el rol al último.

### ✅ Fase 3 — Que los números cierren — HECHA (falta el cambio rápido de precios)
Stock con entradas, merma valorizada, conteo e historial completo. Apertura de caja, ingresos y egresos, y cierre con arqueo a ciegas. Se sumaron además los reportes de la Fase 5 (ganancia real, métodos de pago, más vendidos, horarios), porque sin ellos la merma y el arqueo quedaban registrados pero sin dónde mirarse.

Queda pendiente de esta fase la **pantalla de cambio rápido de precios**.

### ✅ Cobros peruanos — HECHO
Yape y Plin como métodos separados, con el QR de la tienda en pantalla al cobrar. Ver [Qué se tomó de cada sistema](#5-qué-se-tomó-de-cada-sistema-del-mercado).

### Fase 4 — Fiado y proveedores
Clientes con cuenta corriente, pagos, deuda. Proveedores y compras.

### Fase 5 — Control
Pago mixto (una parte en efectivo, otra por Yape). (Usuarios con PIN, roles, respaldo y reportes ya están hechos.)

### Fase 6 — Terminaciones
Impresión bluetooth en térmica. Devoluciones y anulaciones. Ventas en espera. Ajustes finos de la interfaz con el uso real.

### ✅ APK de Android — HECHO
Se envolvió con Capacitor y se genera un `sistema-tienda.apk` instalable con `npm run apk`. Esto adelantó lo que estaba previsto como opcional para el final, porque resolvió de una dos problemas que traía la PWA:

- La cámara necesitaba HTTPS y en el APK funciona con el permiso nativo de Android.
- Ya no hace falta hosting ni depender de internet para instalarla.

La app sigue siendo también una PWA: el mismo código genera las dos cosas.

### Más adelante (opcional)
- Varios celulares compartiendo el mismo stock (requiere un servidor; es un salto grande de complejidad).
- Publicarla en Play Store (requiere cuenta de desarrollador paga y firma con clave propia).

---

## 5. Qué se tomó de cada sistema del mercado

Se miraron los sistemas que hoy usan las tiendas chicas, dos globales y tres
peruanos, para no inventar de cero lo que ya está resuelto.

| Sistema | Qué hace bien | Qué se tomó |
|---|---|---|
| **Loyverse** (gratis, global) | Es la referencia del rubro en su versión gratuita | Aviso de stock bajo, ajustes por *damages and loss* (nuestra merma) y conteo de inventario |
| **Square** (global) | Reportes que se entienden de un vistazo | Panel con vendido, ganancia, ticket promedio y horarios de más venta |
| **Kyte** (62 mil comercios chicos) | Offline de verdad, cobro por QR sin terminal | Confirmación de que el camino offline + QR es el correcto para este tamaño de tienda |
| **PANCA, digabloPos, INVY** (Perú) | Están hechos para la bodega peruana | **Yape y Plin como métodos separados** y arqueo que no mezcla lo digital con el cajón |
| **Bsale** (Perú, pago) | Facturación electrónica SUNAT integrada | Nada por ahora: el Nuevo RUS no está obligado. Ver [FACTURACION-PERU.md](FACTURACION-PERU.md) |

### Lo más importante que salió de mirarlos

**Yape y Plin no son "transferencia".** Alrededor del 70% de las ventas de una
bodega peruana no son con tarjeta, y son interoperables desde 2023: el cliente
paga con QR o al número, sin importar su banco. El error de contabilidad más
común que describen los tres sistemas peruanos es registrar un pago por Yape
como efectivo. Por eso acá son métodos propios y el arqueo los deja afuera del
cajón.

**El QR estático no cobra comisión.** Yape Empresa y Plin Empresa cobran un
porcentaje por transacción; el QR personal no. Como es fijo y no lleva el monto
adentro, la app lo muestra con el importe grande al lado para que el cliente lo
escriba, y el cobro se confirma a mano cuando llega el aviso.

**Lo que se dejó afuera a propósito:** los módulos de fidelización y de venta
por redes sociales que traen Loyverse y Kyte. Son para otro tipo de comercio;
acá agregarían pantallas que nadie va a tocar en el mostrador.

---

## 6. Cosas a tener en cuenta

- **El respaldo va desde la Fase 1.** Los datos viven en el celular; si se pierde o se formatea, sin respaldo se pierde todo. Es el riesgo más serio de esta arquitectura y se resuelve con exportación periódica.
- **La cámara necesita HTTPS.** Para desarrollo alcanza con `localhost`; para usarlo en la tienda hay que servir la app por HTTPS (hay opciones gratuitas) o pasar a APK.
- **iPhone es más limitado** que Android para PWAs (Web Bluetooth no funciona en iOS, así que la impresora térmica ahí no anda). Si la tienda usa iPhone y quiere imprimir, hay que ir a Capacitor antes.
- **Un lector de código de barras USB o bluetooth** es una mejora barata y grande si el volumen de venta sube: escanea mucho más rápido que la cámara y no se cansa el brazo. El sistema lo soporta sin cambios, porque el lector se comporta como un teclado.
- **Las boletas son documentos no fiscales.** Sirven como comprobante para el cliente y como registro tuyo, pero no reemplazan una factura oficial ante la agencia impositiva. Si en algún momento hace falta facturar en serio, es otro desarrollo aparte.
- **Los PDF de boletas ocupan lugar** en el celular. Por eso quedan guardados dentro de la app y no se generan solos: solo existen los que realmente se pidieron. De todas formas conviene una limpieza automática de PDF viejos (los datos de la boleta quedan, se borra solo el archivo pesado, y se puede regenerar cuando haga falta).

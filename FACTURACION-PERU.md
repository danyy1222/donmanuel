# Facturación electrónica en Perú — Requisitos

Investigación para incorporar comprobantes oficiales SUNAT al sistema.
Situación de partida: **sin RUC, sin certificado, sin inscripción**.

---

## Lo primero: probablemente no necesitás lo que pediste

Una verdulería de barrio entra en el **Nuevo RUS (NRUS)**, y ahí:

- **Solo se emiten boletas de venta.** Las facturas no están permitidas en NRUS.
  Si un cliente te pide factura para descontar impuestos, no se la podés dar en
  este régimen.
- **No estás obligado a emitir electrónicamente.** La Resolución 000075-2026,
  que desde junio de 2026 obliga a los nuevos inscritos a facturar
  electrónicamente desde el primer día, **alcanza a RMT, RER y Régimen General,
  no al NRUS**. Los del NRUS pueden seguir con talonario de imprenta.

O sea: podés cumplir con la ley con un **talonario de papel de S/180** y sin
tocar una línea de código.

Eso no significa que no convenga hacerlo electrónico. Significa que es una
decisión de conveniencia, no una obligación, y eso cambia cómo encararlo.

---

## Corrección a lo que te dije antes

Te advertí que un facturador rompería el funcionamiento sin internet. **Para
boletas eso es falso**, y es la mejor noticia de toda esta investigación.

Las boletas de venta electrónicas **no necesitan autorización de SUNAT en el
momento de la venta**. Se emiten en el sistema propio y se informan después,
mediante un **resumen diario** que tenés hasta el **séptimo día calendario**
para enviar.

Es decir: **la app puede seguir vendiendo sin internet exactamente como ahora**,
y sincronizar cuando haya señal. La arquitectura actual no se tira abajo.

(Las **facturas** sí requieren envío casi inmediato, pero en NRUS no las emitís.)

---

## Requisitos que tenés que cumplir vos

Ordenados. Cada uno depende del anterior.

### Paso 1 — Juntar los datos personales

| Requisito | Detalle |
|---|---|
| DNI vigente | O carné de extranjería / pasaporte con calidad migratoria |
| Número de celular | Se registra en SUNAT y se usa para trámites |
| Correo electrónico | Idem |
| Dirección fiscal | Dónde funciona la tienda |
| Comprobante del domicilio | **Solo si la dirección de la tienda es distinta a la del DNI**: un recibo de luz, agua o similar |
| Código CIIU | El código de tu actividad. Para verdulería es comercio al por menor de alimentos |

### Paso 2 — Sacar el RUC

**Es gratis y queda activo al instante.**

Dos formas:
- **Virtual**: en SUNAT Virtual con tu DNI, escaneando un QR con la app SUNAT Personas.
- **Presencial**: en una oficina SUNAT con el Formulario 2119.

Al inscribirte te van a pedir que elijas el régimen tributario. **Acá se define
todo lo demás**, así que ver el paso siguiente antes de elegir.

### Paso 3 — Elegir el régimen

Para una verdulería, **NRUS**:

| Categoría | Ingresos o compras mensuales | Cuota mensual |
|---|---|---|
| **1** | hasta S/5.000 | **S/20** |
| **2** | hasta S/8.000 | **S/50** |

Condiciones del NRUS:
- Ventas mensuales que no superen **S/8.000**
- Activos fijos del negocio hasta **S/70.000** (sin contar vehículos ni predios)
- **Un solo local**
- No se puede importar mercadería

Lo que perdés en NRUS: no podés emitir facturas, no deducís gastos, y el IGV de
tus compras no es crédito fiscal.

> **Si vendés más de S/8.000 al mes, el NRUS no te sirve** y pasás a RER o RMT.
> Ahí sí la emisión electrónica pasa a ser obligatoria desde el primer día.

### Paso 4 — Clave SOL

Se obtiene junto con el RUC. Es la contraseña para entrar a SUNAT Operaciones
en Línea. Sin esto no se hace ningún trámite posterior.

### Paso 5 — Certificado Digital Tributario (solo si vamos por sistema propio)

**SUNAT lo da gratis** si tus ingresos netos anuales son de hasta **S/1.260.000**.
Una verdulería en NRUS factura como máximo S/96.000 al año, así que **calificás
holgado**.

Si por algún motivo no calificaras, en proveedores privados cuesta alrededor de
**S/295 por un año** o **S/708 por tres**.

El certificado es lo que permite que un sistema firme comprobantes
automáticamente. **No hace falta** si emitís desde el portal de SUNAT o si
contratás un proveedor que ponga el suyo.

### Paso 6 — Registrarte como emisor electrónico

Trámite en el portal con la Clave SOL. Es el que te habilita a emitir
comprobantes electrónicos desde tu propio sistema.

---

## Los cuatro caminos posibles

### A. Talonario de papel

Boletas impresas por imprenta autorizada.

- **Costo**: desde **S/180** por 5 talonarios de 100 hojas. La autorización de
  SUNAT es **gratis** (Formulario 816).
- **Desarrollo**: ninguno.
- **Contra**: se llena a mano, no se integra con el sistema, y hay que pedir
  autorización cada vez que se acaban.
- **Ojo**: para autorizar impresión en NRUS piden tener declaradas las cuotas de
  los seis meses anteriores. Al arrancar de cero eso puede trabar el trámite.

### B. Portal de SUNAT (SEE-SOL)

Emitir cada boleta a mano en el sitio de SUNAT.

- **Costo**: **gratis**. **No necesita certificado digital**: los documentos los
  firma SUNAT.
- **Desarrollo**: ninguno.
- **Contra**: hay que cargar cada venta a mano en la web. **Para una verdulería
  con decenas de ventas por día es inviable.**

### C. Proveedor externo con API (recomendado para empezar)

Un servicio tipo NubeFacT se encarga de armar el XML, firmarlo y hablar con
SUNAT. La app le manda los datos de la venta por una API.

- **Costo**: desde **S/40 al mes**, hasta 500 comprobantes. **Incluye el
  certificado digital.**
- **Desarrollo**: pocos días. La app manda un JSON y recibe el comprobante.
- **A favor**: si SUNAT cambia el formato, lo arregla el proveedor. Nosotros no
  mantenemos nada de eso.
- **Contra**: costo mensual fijo y dependencia de un tercero.

### D. Sistema propio (SEE del contribuyente)

Nosotros generamos el XML UBL 2.1, lo firmamos con el certificado y hablamos
directo con los web services de SUNAT.

- **Costo**: **S/0** de servicio. Certificado gratis de SUNAT.
- **Desarrollo**: semanas, y mantenimiento continuo.
- **Buena noticia**: **el proceso de homologación fue eliminado** (Resolución
  287-2017). Ya no hay que certificar el sistema con SUNAT antes de usarlo; se
  prueba en el ambiente de homologación y se pasa a producción.
- **Contra**: cada cambio de norma de SUNAT hay que implementarlo. Un error en
  el formato se traduce en comprobantes rechazados.

### Comparación

| | Papel | Portal SUNAT | Proveedor API | Sistema propio |
|---|---|---|---|---|
| Costo inicial | S/180 | S/0 | S/0 | S/0 |
| Costo mensual | — | S/0 | ~S/40 | S/0 |
| Desarrollo | ninguno | ninguno | días | semanas |
| Sirve con volumen alto | ✅ | ❌ | ✅ | ✅ |
| Integrado a la app | ❌ | ❌ | ✅ | ✅ |
| Mantenimiento a futuro | bajo | ninguno | del proveedor | **nuestro** |

---

## Requisitos técnicos (caminos C y D)

### Datos que la boleta debe llevar

- RUC, nombre o razón social y dirección del emisor
- Tipo y número de comprobante, con **serie** (ej. `B001-00000123`)
- Fecha de emisión
- Descripción, cantidad y precio de cada producto
- Importe total
- **Identificación del cliente con DNI o RUC** cuando el total **supera
  S/700** o cuando el cliente lo pide

### Entrega al cliente

**Impresa o digital, las dos valen.** La digital requiere acuerdo con el
cliente. El envío por WhatsApp que ya tiene la app **sirve tal cual**.

### Formato (solo camino D)

- **XML UBL 2.1**, codificación UTF-8
- **Firma digital X.509 v3** con hash **SHA-256**
- Envío por **web service** a SUNAT
- **Resumen diario (RC)** de las boletas del día, hasta el 7° día calendario
- **Comunicación de baja** para anular comprobantes
- Manejo de la **CDR** (constancia de recepción): aceptada o rechazada

### Lo que cambia en la app

Aunque vayamos por el camino más simple, hay cosas que hay que tocar:

1. **Numeración con serie oficial** (`B001-00000123`) en vez de la interna
   `BOL-0001`. La numeración **no puede tener huecos**: es lo que más se
   controla.
2. **Datos fiscales de la tienda**: RUC, razón social, dirección fiscal.
3. **Datos del cliente**: DNI o RUC, obligatorio arriba de S/700.
4. **Estado de cada comprobante**: emitido, enviado, aceptado, rechazado, anulado.
5. **Cola de envío**: las boletas se acumulan y se mandan cuando hay internet,
   con reintentos. Esto es lo que permite seguir vendiendo sin señal.
6. **Anulación**: hoy no existe. Una boleta emitida no se borra, se anula con
   una comunicación de baja.

---

## Aparte: la app está configurada para Argentina

Esto es independiente de la facturación y hay que corregirlo igual:

- Los importes se muestran con **`$`**, debería ser **`S/`**.
- El formato de número usa el de Argentina.
- Los **precios de ejemplo están en otra escala**: el tomate figura a "1800 el
  kilo", que en soles no tiene ningún sentido.

Es un cambio chico y conviene hacerlo antes de cargar los productos de verdad.

---

## Recomendación

**Para arrancar: inscribirte en NRUS y usar el camino C (proveedor con API).**

Por qué:

- El NRUS es el régimen que te corresponde por tamaño y el más barato (S/20 o
  S/50 al mes).
- El proveedor cuesta ~S/40 al mes e **incluye el certificado digital**, así que
  te ahorra el trámite del certificado.
- El desarrollo es de días, no de semanas.
- **Cuando SUNAT cambie algo, lo arregla el proveedor.** Esto es lo más
  importante a largo plazo: un facturador propio no se termina nunca, hay que
  mantenerlo mientras el negocio exista.

El camino D (todo propio) tiene sentido si el volumen crece tanto que S/40 al
mes moleste, o si querés no depender de nadie. Se puede migrar después: la
estructura de datos es la misma.

**El camino B (portal SUNAT) no lo descartes para el primer mes**: es gratis, no
requiere nada, y te deja probar cómo es emitir boletas de verdad antes de
comprometerte con un proveedor.

---

## Qué hacer ahora

Lo único que te bloquea todo es el **RUC**. Sin eso no hay certificado, ni
emisor electrónico, ni serie de comprobantes.

1. Juntá los datos del Paso 1.
2. Sacá el RUC eligiendo **NRUS categoría 1** (se puede cambiar después).
3. Pasame el **RUC, la razón social y la dirección fiscal**.

Con eso puedo dejar la app lista: numeración con serie, datos fiscales, DNI del
cliente y la cola de envío. Todo eso se programa sin esperar el certificado.

---

## Fuentes

- [Inscripción en el RUC — SUNAT](https://www.gob.pe/284-inscripcion-en-el-ruc)
- [Nuevo RUS — categorías y requisitos](https://tramitesperu.com/sunat/nuevo-rus/)
- [Resolución 000075-2026/SUNAT — emisión electrónica desde la inscripción](https://contauno.com/blog/resoluci%C3%B3n-de-superintendencia-n-000075-2026sunat)
- [Boleta de Venta Electrónica — SUNAT CPE](https://cpe.sunat.gob.pe/tipos_de_comprobantes/boleta)
- [Resumen Diario de Boletas — SUNAT](https://orientacion.sunat.gob.pe/04-resumen-diario-boleta-de-venta-electronica)
- [Certificado Digital Tributario — SUNAT](https://www.gob.pe/26402-certificado-digital-tributario-cdt)
- [Sistema de Emisión SOL — SUNAT](https://cpe.sunat.gob.pe/sistema_emision/see_sol)
- [Guía XML UBL 2.1 — SUNAT](https://cpe.sunat.gob.pe/sites/default/files/inline-files/guia+xml+factura+version%202-1+1+0%20(2)_0%20(2).pdf)
- [Eliminación del proceso de homologación](https://noticierocontable.com/adios-al-proceso-homologacion/)
- [Precios NubeFacT](https://www.nubefact.com/precios)
- [Boletas físicas — imprenta autorizada](https://www.gob.pe/1154-comprobantes-que-emites-en-el-nrus-emitir-boleta-de-venta-impresa-en-el-nuevo-rus)

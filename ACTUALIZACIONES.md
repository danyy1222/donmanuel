# Actualizaciones

> **Estado: el Nivel 1 está hecho y funcionando.** La app avisa sola cuando hay
> una versión nueva. El Nivel 2 (que se actualice sin reinstalar) sigue
> pendiente.

## Cómo publicar una actualización

**1. Subir el número de versión** en `package.json`:

```json
"version": "1.2.2"
```

**2. Generar el APK**

```bash
npm run apk
```

**3. Publicar**

```bash
npm run publicar 1.2.2 "Ahora se puede anotar la merma de verduras."
```

Eso hace todo lo demás: crea el Release en GitHub, sube el APK, actualiza
`version.json` con el enlace al archivo nuevo, lo commitea, hace push y purga
el caché del CDN.

Los celulares lo ven en la próxima apertura de la app, que revisa como mucho
una vez por hora.

### Por qué el script hace todo eso

Cada paso está resolviendo un problema que apareció haciéndolo a mano:

- **El aviso va último.** Publicarlo antes que el APK dejaría a los celulares
  con un enlace de descarga que todavía no existe.
- **El enlace apunta al archivo, no a la página del Release.** Desde el celular,
  esa página obliga a bajar hasta "Assets" y elegir entre varios archivos.
- **Se purga el caché de jsDelivr.** Sin eso el CDN sigue sirviendo la versión
  anterior hasta doce horas y nadie se entera de la actualización.
- **Se verifica que `package.json` coincida** con la versión que se publica. Si
  no, el APK llevaría adentro el número viejo y la app se creería
  desactualizada para siempre.

### Qué NO hacer

**No repitas un número de versión.** Si ya publicaste la `1.2.0` y le cambiás
el contenido, los celulares que ya la vieron no se enteran: la comparación es
por número.

---

# Cómo mandar actualizaciones sin gastar dinero

El problema: la app se instala pasando un archivo APK. Cuando le agrego algo,
hay que volver a pasar el archivo y reinstalar a mano en cada celular. Con un
teléfono se aguanta; con tres empleados ya es un lío.

**Ya tenemos el servidor gratis: el repositorio de GitHub.**

---

## La idea en dos niveles

### Nivel 1 — La app avisa que hay versión nueva

Al abrirse, la app consulta un archivo en GitHub y compara la versión. Si hay
una más nueva, muestra un cartel con el enlace para descargarla.

```
┌──────────────────────────────┐
│  Hay una versión nueva       │
│                              │
│  Ahora se puede anotar la    │
│  merma de verduras.          │
│                              │
│  [ Descargar ]  [ Después ]  │
└──────────────────────────────┘
```

- **Costo**: S/0
- **Trabajo**: medio día
- **Contra**: la persona igual tiene que tocar "Instalar"

### Nivel 2 — La app se actualiza sola

Casi todo lo que cambio es código web: pantallas, cálculos, precios,
correcciones. Eso se puede empaquetar aparte y que la app lo descargue y lo
aplique **sin reinstalar nada**.

La persona abre la app y ya está actualizada. No toca nada, no ve nada.

- **Costo**: S/0
- **Trabajo**: uno o dos días
- **Cubre**: alrededor del 95% de los cambios
- **No cubre**: agregar permisos nuevos (otra cámara, GPS), plugins nativos
  nuevos, o cambiar el ícono. Ahí sí hace falta APK nuevo — y para eso está el
  Nivel 1.

**Lo recomendable es tener los dos**: el Nivel 2 para el día a día, el Nivel 1
como respaldo para las pocas veces que haga falta reinstalar de verdad.

---

## Cómo funciona por dentro

### Dónde se guarda

En **GitHub Releases**, dentro del repositorio que ya tenemos. Cada versión
sube dos archivos:

- `bundle.zip` — el código web actualizado (unos 400 KB)
- `tienda-don-manuel.apk` — solo cuando hace falta reinstalar

GitHub sirve esos archivos gratis, con HTTPS y sin límite práctico para el
tamaño de esta tienda.

### Qué consulta la app

```
https://api.github.com/repos/danyy1222/donmanuel/releases/latest
```

Devuelve la versión más reciente y los enlaces de descarga. La app compara con
la versión que tiene instalada y decide.

> **Ojo con esto**: funciona sin contraseña **solo si el repositorio es
> público**. Si lo pasás a privado, hay que meter una clave dentro de la app, y
> una clave dentro de un APK que se reparte no es secreta. Si querés el repo
> privado, la salida limpia es publicar solo el archivo de versiones en
> **GitHub Pages**, que es gratis y separado del código.

### Cuándo revisa

- Al abrir la app
- Y como mucho una vez por hora, para no gastar datos ni batería

**Nunca en medio de una venta.** La actualización se aplica al reiniciar la
app, no mientras se está cobrando.

---

## Lo que hay que cuidar

**Que no se rompa la caja.** Si una actualización sale mal, la tienda no puede
vender. El plugin que usaríamos vuelve solo a la versión anterior si la app no
arranca bien; eso hay que dejarlo activado y probarlo.

**Los datos no se tocan.** Las actualizaciones cambian el código, nunca la base
de datos del celular. Productos, ventas y boletas quedan intactos.

**Probar antes de publicar.** Lo que se sube queda en todos los celulares en
minutos. Conviene una versión de prueba en un solo teléfono antes de largarla a
todos.

**Si algún día va a Play Store**, esto no sirve: Google prohíbe que una app
descargue código de afuera. Instalando el APK a mano, como hacemos, no hay
problema.

---

## Comparación con las otras opciones

| | Costo | Se actualiza sola | Trabajo |
|---|---|---|---|
| Como ahora (pasar el APK a mano) | S/0 | ❌ | ninguno |
| **Nivel 1 — avisa** | **S/0** | ❌ avisa nomás | medio día |
| **Nivel 2 — automático** | **S/0** | ✅ | 1-2 días |
| Servicio pago (Capgo Cloud) | ~US$14/mes | ✅ | pocas horas |
| Google Play Store | US$25 una vez | ✅ | días + esperar revisión |

Play Store tiene sentido si algún día querés que otras tiendas la usen. Para
tus propios celulares es dar una vuelta larga: hay que esperar revisión de
Google por cada cambio.

---

## Qué haría yo

Empezar por el **Nivel 1**, que es medio día y ya resuelve lo peor: enterarse
de que hay algo nuevo. Después sumar el **Nivel 2** cuando la app esté en más
de un celular y reinstalar a mano empiece a molestar.

Los dos usan el mismo repositorio de GitHub que ya está andando. **Costo total:
cero.**

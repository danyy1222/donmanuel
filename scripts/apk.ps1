# Genera el APK de Android listo para instalar en el celular.
#
# Uso:  npm run apk           -> la app de la tienda
#       npm run apk:pruebas   -> la app de pruebas, que se instala al lado
#
# La de pruebas tiene otro applicationId, asi que Android la trata como una app
# distinta: convive con la de la tienda, con su propia base de datos, y no busca
# actualizaciones.
#
# Las herramientas de Android estan fuera del proyecto y no en el PATH del
# sistema, asi que se apuntan aca. Si las moves de lugar, cambia estas rutas.

param([ValidateSet('produccion', 'pruebas')][string]$Canal = 'produccion')

$ErrorActionPreference = 'Stop'
$esPruebas = $Canal -eq 'pruebas'

$herramientas = 'C:\Users\PC\android-build'
$env:JAVA_HOME = "$herramientas\jdk"
$env:ANDROID_HOME = "$herramientas\sdk"
$env:ANDROID_SDK_ROOT = "$herramientas\sdk"
$env:PATH = "$herramientas\jdk\bin;$env:PATH"

$proyecto = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $env:JAVA_HOME)) {
    Write-Error "No encuentro el JDK en $env:JAVA_HOME"
}

Write-Host "`n[1/3] Compilando la app web (canal: $Canal)..." -ForegroundColor Cyan
Set-Location $proyecto
$env:CANAL = $Canal
npm run build
if (-not $?) { Write-Error "Fallo el build de la web" }

Write-Host "`n[2/3] Copiando al proyecto Android..." -ForegroundColor Cyan
npx cap sync android
if (-not $?) { Write-Error "Fallo el sync de Capacitor" }

Write-Host "`n[3/3] Generando el APK (puede tardar unos minutos)..." -ForegroundColor Cyan
Set-Location "$proyecto\android"
.\gradlew.bat assembleDebug --no-daemon "-Pcanal=$Canal"
if (-not $?) { Write-Error "Fallo la compilacion del APK" }

$origen = "$proyecto\android\app\build\outputs\apk\debug\app-debug.apk"
$nombre = if ($esPruebas) { 'don-manuel-pruebas.apk' } else { 'sistema-tienda.apk' }
$destino = "$proyecto\$nombre"
Copy-Item $origen $destino -Force

$mb = [math]::Round((Get-Item $destino).Length / 1MB, 1)
Write-Host "`nLISTO -> $nombre ($mb MB)" -ForegroundColor Green
if ($esPruebas) {
    Write-Host "App de pruebas: se instala AL LADO de la de la tienda, sin reemplazarla."
    Write-Host "En el celular aparece como 'Don Manuel PRUEBAS'.`n"
} else {
    Write-Host "Pasalo al celular y abrilo para instalar.`n"
}

Set-Location $proyecto

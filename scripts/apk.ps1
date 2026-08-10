# Genera el APK de Android listo para instalar en el celular.
#
# Uso:  npm run apk
#
# Las herramientas de Android estan fuera del proyecto y no en el PATH del
# sistema, asi que se apuntan aca. Si las moves de lugar, cambia estas rutas.

$ErrorActionPreference = 'Stop'

$herramientas = 'C:\Users\PC\android-build'
$env:JAVA_HOME = "$herramientas\jdk"
$env:ANDROID_HOME = "$herramientas\sdk"
$env:ANDROID_SDK_ROOT = "$herramientas\sdk"
$env:PATH = "$herramientas\jdk\bin;$env:PATH"

$proyecto = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $env:JAVA_HOME)) {
    Write-Error "No encuentro el JDK en $env:JAVA_HOME"
}

Write-Host "`n[1/3] Compilando la app web..." -ForegroundColor Cyan
Set-Location $proyecto
npm run build
if (-not $?) { Write-Error "Fallo el build de la web" }

Write-Host "`n[2/3] Copiando al proyecto Android..." -ForegroundColor Cyan
npx cap sync android
if (-not $?) { Write-Error "Fallo el sync de Capacitor" }

Write-Host "`n[3/3] Generando el APK (puede tardar unos minutos)..." -ForegroundColor Cyan
Set-Location "$proyecto\android"
.\gradlew.bat assembleDebug --no-daemon
if (-not $?) { Write-Error "Fallo la compilacion del APK" }

$origen = "$proyecto\android\app\build\outputs\apk\debug\app-debug.apk"
$destino = "$proyecto\sistema-tienda.apk"
Copy-Item $origen $destino -Force

$mb = [math]::Round((Get-Item $destino).Length / 1MB, 1)
Write-Host "`nLISTO -> sistema-tienda.apk ($mb MB)" -ForegroundColor Green
Write-Host "Pasalo al celular y abrilo para instalar.`n"

Set-Location $proyecto

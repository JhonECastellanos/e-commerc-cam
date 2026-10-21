param([switch]$Desactivar, [switch]$Compilar)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskCompose = @('compose', '-p', 'e-commerc-cam', '-f', (Join-Path $taskRoot 'docker-compose.yml'), '--profile', 'internet')
$taskConfigDir = Join-Path $taskRoot '.local/tailscale/config'
$taskConfig = Join-Path $taskConfigDir 'serve.json'
[IO.Directory]::CreateDirectory($taskConfigDir) | Out-Null

function Invoke-ProjectDocker([string[]]$Arguments) {
    $taskPrevious = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $taskOutput = & docker.exe @Arguments 2>&1; $taskExit = $LASTEXITCODE }
    finally { $ErrorActionPreference = $taskPrevious }
    if ($taskExit -ne 0) { throw ('Docker no pudo completar la operación: ' + ($taskOutput -join "`n")) }
    return @($taskOutput | ForEach-Object { $_.ToString() })
}
function Write-ProjectFile([string]$Path, [string]$Content) {
    $taskTemp = $Path + '.tmp'
    [IO.File]::WriteAllText($taskTemp, $Content, [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $taskTemp -Destination $Path -Force
}
if ($Desactivar) {
    Write-ProjectFile $taskConfig "{}`n"
    Invoke-ProjectDocker ($taskCompose + @('stop', 'tailscale')) | Write-Output
    Write-Output 'Publicación Tailscale detenida. Identidad y datos conservados.'
    exit 0
}
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot '.env'))) { throw 'Falta la configuración privada .env del proyecto.' }
if (-not (Test-Path -LiteralPath $taskConfig)) { Write-ProjectFile $taskConfig "{}`n" }
# Remain closed until the image, identity, host configuration and guards are checked.
Write-ProjectFile $taskConfig "{}`n"
if ($Compilar) { Invoke-ProjectDocker ($taskCompose + @('build', 'frontend')) | Write-Output }
Invoke-ProjectDocker ($taskCompose + @('up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'frontend')) | Write-Output
Invoke-ProjectDocker ($taskCompose + @('up', '-d', '--no-deps', '--no-build', 'tailscale')) | Write-Output
# Docker Desktop bind mounts may not forward file change notifications. Restart
# this connector so the empty config is applied before checking the public edge.
Invoke-ProjectDocker ($taskCompose + @('restart', 'tailscale')) | Write-Output
Start-Sleep -Seconds 3
$taskPrevious = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try { $taskStatus = & docker.exe exec e-commerc-cam-tailscale-1 tailscale --socket=/tmp/tailscaled.sock status --json 2>&1; $taskStatusCode = $LASTEXITCODE }
finally { $ErrorActionPreference = $taskPrevious }
if ($taskStatusCode -notin @(0, 1)) { throw 'No se pudo consultar el conector Tailscale.' }
$taskState = $taskStatus | Out-String | ConvertFrom-Json
if ($taskState.BackendState -ne 'Running') {
    if ($taskState.AuthURL) {
        Write-ProjectFile (Join-Path $taskRoot '.local/tailscale/login-url.txt') $taskState.AuthURL
        Write-Output ('Autoriza el nuevo dispositivo instalacam con tu cuenta Tailscale: ' + $taskState.AuthURL)
    }
    Write-Output 'Todavía no hay sitio publicado. Tras autorizar el dispositivo, ejecuta de nuevo este iniciador.'
    exit 2
}
$taskHost = $taskState.Self.DNSName.TrimEnd('.')
if ($taskHost -notmatch '^instalacam(?:-[a-z0-9]+)?\.[a-z0-9.-]+\.ts\.net$') { throw 'La identidad no corresponde al dispositivo instalacam esperado.' }
$taskUrl = 'https://' + $taskHost
$taskEnv = "FRONTEND_ORIGINS=$taskUrl`nTRUSTED_HOSTS=localhost,127.0.0.1,frontend,$taskHost`nAUTO_INIT_DB=false`n"
$taskEnvPath = Join-Path $taskRoot '.env.tailscale'
$taskCurrent = if (Test-Path -LiteralPath $taskEnvPath) { [IO.File]::ReadAllText($taskEnvPath) } else { '' }
if ($taskEnv -ne $taskCurrent) {
    Write-ProjectFile $taskEnvPath $taskEnv
    Invoke-ProjectDocker ($taskCompose + @('up', '-d', '--no-deps', '--no-build', '--force-recreate', '--wait', '--wait-timeout', '90', 'backend')) | Write-Output
}
# Verify the actual nginx listener before enabling Funnel, without credentials.
$taskGuardCheck = @'
import urllib.request, urllib.error
for path in ['/admin/login','/api/admin/me','/api/admin/agent/mcp','/api/internal/whatsapp/incoming','/api/uploads/agreements/test.pdf']:
    try:
        urllib.request.urlopen('http://frontend:8082'+path,timeout=10)
        raise RuntimeError('Ruta privada accesible: '+path)
    except urllib.error.HTTPError as error:
        if error.code != 404: raise
response=urllib.request.urlopen('http://frontend:8082/api/health/ready',timeout=10)
assert response.status == 200
print('Filtro público verificado; administración e integraciones privadas bloqueadas.')
'@
$taskGuardCheck | & docker.exe @taskCompose exec -T backend python -
if ($LASTEXITCODE -ne 0) { throw 'El filtro de privacidad no pasó. Funnel permanece desactivado.' }
Write-ProjectFile $taskConfig ([IO.File]::ReadAllText((Join-Path $taskRoot 'infra/tailscale/serve.example.json')))
Invoke-ProjectDocker ($taskCompose + @('restart', 'tailscale')) | Write-Output
$taskReady = $false
for ($taskAttempt = 0; $taskAttempt -lt 90; $taskAttempt++) {
    try {
        $taskResponse = Invoke-WebRequest -Uri ($taskUrl + '/api/health/ready') -UseBasicParsing -TimeoutSec 5
        if ($taskResponse.StatusCode -eq 200 -and ($taskResponse.Content | ConvertFrom-Json).status -eq 'ok') { $taskReady = $true; break }
    } catch { Start-Sleep -Seconds 2 }
}
if (-not $taskReady) {
    Write-ProjectFile $taskConfig "{}`n"
    Invoke-ProjectDocker ($taskCompose + @('stop', 'tailscale')) | Write-Output
    throw 'La publicación no respondió; Funnel se desactivó. Revisa autorización, permisos Funnel y DNS y vuelve a ejecutar.'
}
Write-ProjectFile (Join-Path $taskRoot '.local/tailscale-url.txt') ($taskUrl + "`n")
Write-Output ('Sitio público: ' + $taskUrl)
Write-Output 'Administrador privado: http://localhost:8094/admin/login'
Write-Output 'La identidad vive exclusivamente en el volumen e-commerc-cam_tailscale_state.'

param([switch]$Renovar)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskCompose = @('compose', '-p', 'e-commerc-cam', '-f', (Join-Path $taskRoot 'docker-compose.yml'), '--profile', 'cloudflare')

function Invoke-PlatformDocker([string[]]$Arguments) {
    # Docker escribe mensajes normales en stderr; PS 5 no debe tratarlos como errores.
    $taskPrevious = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $taskOutput = & docker.exe @Arguments 2>&1
        $taskCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $taskPrevious }
    if ($taskCode -ne 0) { throw ('Docker falló: ' + ($taskOutput -join "`n")) }
    return @($taskOutput | ForEach-Object { $_.ToString() })
}

function Get-AllowedSetting([string]$Name, [string[]]$Environment, [string]$Fallback) {
    $taskMatch = $Environment | Where-Object { $_.StartsWith($Name + '=') } | Select-Object -First 1
    if ($taskMatch) { return $taskMatch.Substring($Name.Length + 1) }
    return $Fallback
}

& (Join-Path $PSScriptRoot 'prepare-local.ps1')
Invoke-PlatformDocker ($taskCompose + @('up', '-d', '--no-deps', '--no-build', '--wait', '--wait-timeout', '60', 'frontend')) | Write-Output
# Lee únicamente la configuración de este backend; no imprime secretos.
$taskBackend = (Invoke-PlatformDocker @('inspect', 'e-commerc-cam-backend-1') | Out-String | ConvertFrom-Json)[0]
$taskOrigins = Get-AllowedSetting 'FRONTEND_ORIGINS' $taskBackend.Config.Env 'http://localhost:8094,http://127.0.0.1:8094'
$taskProductionFile = Join-Path $taskRoot '.env.production-local'
$taskProduction = (Get-AllowedSetting 'APP_ENV' $taskBackend.Config.Env '') -eq 'production' -or ((Test-Path -LiteralPath $taskProductionFile) -and ([IO.File]::ReadAllText($taskProductionFile) -match '(?m)^APP_ENV=production\s*$'))
if ($taskProduction) {
    $taskOrigins = (@($taskOrigins.Split(',') | Where-Object { $_ -match '^https://' -and $_ -notmatch 'localhost|127\.0\.0\.1' })) -join ','
}
$taskHosts = Get-AllowedSetting 'TRUSTED_HOSTS' $taskBackend.Config.Env 'localhost,127.0.0.1,testserver'
$taskStart = $taskCompose + @('up', '-d', '--no-deps', '--no-build')
if ($Renovar) { $taskStart += '--force-recreate' }
Invoke-PlatformDocker ($taskStart + @('cloudflared')) | Write-Output
$taskTunnel = (Invoke-PlatformDocker @('inspect', 'e-commerc-cam-cloudflared-1') | Out-String | ConvertFrom-Json)[0]
$taskUrl = $null
for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
    $taskLogs = Invoke-PlatformDocker @('logs', '--since', $taskTunnel.State.StartedAt, 'e-commerc-cam-cloudflared-1')
    $taskMatches = [regex]::Matches(($taskLogs -join "`n"), 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($taskMatches.Count) { $taskUrl = $taskMatches[$taskMatches.Count - 1].Value; break }
    Start-Sleep -Seconds 2
}
if (-not $taskUrl) { throw 'Cloudflare no entregó una URL. Revisa los logs de e-commerc-cam-cloudflared-1.' }
$taskHost = ([uri]$taskUrl).DnsSafeHost
$taskOrigins = (@($taskOrigins.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch '\.trycloudflare\.com/?$' }) + $taskUrl | Select-Object -Unique) -join ','
$taskHosts = (@($taskHosts.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch '\.trycloudflare\.com$' }) + $taskHost | Select-Object -Unique) -join ','
# Configuración opcional exclusiva de esta plataforma. No cambia .env ni credenciales.
$taskConfig = "FRONTEND_ORIGINS=$taskOrigins`nTRUSTED_HOSTS=$taskHosts`nAUTO_INIT_DB=false`n"
$taskConfigPath = Join-Path $taskRoot '.env.cloudflare'
$taskCurrentConfig = if (Test-Path -LiteralPath $taskConfigPath) { [IO.File]::ReadAllText($taskConfigPath) } else { '' }
if ($taskCurrentConfig -ne $taskConfig) {
    [IO.File]::WriteAllText($taskConfigPath, $taskConfig, [Text.UTF8Encoding]::new($false))
}
if ((Get-AllowedSetting 'FRONTEND_ORIGINS' $taskBackend.Config.Env '') -ne $taskOrigins -or
    (Get-AllowedSetting 'TRUSTED_HOSTS' $taskBackend.Config.Env '') -ne $taskHosts -or
    (Get-AllowedSetting 'AUTO_INIT_DB' $taskBackend.Config.Env '') -ne 'false') {
    Invoke-PlatformDocker ($taskCompose + @('up', '-d', '--no-deps', '--no-build', '--force-recreate', '--wait', '--wait-timeout', '60', 'backend')) | Write-Output
}
$taskReady = $false
for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
    try {
        $taskResponse = Invoke-WebRequest -Uri ($taskUrl + '/api/health/ready') -UseBasicParsing -TimeoutSec 10
        if ($taskResponse.StatusCode -eq 200 -and ($taskResponse.Content | ConvertFrom-Json).status -eq 'ok') { $taskReady = $true; break }
    } catch { Start-Sleep -Seconds 2 }
}
if (-not $taskReady) { throw 'El túnel existe, pero la API todavía no responde. Vuelve a ejecutar el iniciador.' }
$taskLocalDir = Join-Path $taskRoot '.local'
[IO.Directory]::CreateDirectory($taskLocalDir) | Out-Null
[IO.File]::WriteAllText((Join-Path $taskLocalDir 'cloudflare-url.txt'), $taskUrl + "`n", [Text.UTF8Encoding]::new($false))
Write-Output "`nE-commerce de cámaras: $taskUrl"
Write-Output "Panel del e-commerce: $taskUrl/admin/login"
Write-Output 'Enlace temporal. Ejecuta este iniciador después de reiniciar Docker; -Renovar crea otro enlace.'

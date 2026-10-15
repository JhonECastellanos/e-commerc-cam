$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskEnvFile = Join-Path $taskRoot '.env'
if (Test-Path -LiteralPath $taskEnvFile) {
    Write-Output 'Se conserva la configuración .env existente.'
    exit 0
}
function New-LocalSecret {
    $taskBytes = New-Object byte[] 32
    $taskRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $taskRng.GetBytes($taskBytes)
    $taskRng.Dispose()
    return ([BitConverter]::ToString($taskBytes)).Replace('-', '').ToLowerInvariant()
}
$taskConfig = @(
    'APP_ENV=development',
    'POSTGRES_DB=instalacam',
    'POSTGRES_USER=instalacam',
    ('POSTGRES_PASSWORD=' + (New-LocalSecret)),
    ('SECRET_KEY=' + (New-LocalSecret)),
    'INITIAL_ADMIN_EMAIL=admin@instalacam.local',
    ('INITIAL_ADMIN_PASSWORD=' + (New-LocalSecret)),
    'HTTP_PORT=8094',
    'BACKEND_PORT=8001',
    'FRONTEND_ORIGINS=http://localhost:8094,http://127.0.0.1:8094,http://localhost:5173,http://127.0.0.1:5173',
    'TRUSTED_HOSTS=localhost,127.0.0.1,testserver',
    'WHATSAPP_PROVIDER=off',
    'GEMINI_API_KEY=',
    'GEMINI_MODEL=gemini-3.1-flash-lite',
    'AUTO_INIT_DB=true'
)
[System.IO.File]::WriteAllText($taskEnvFile, ($taskConfig -join "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Creada configuración local con credenciales aleatorias. Se guardan solo en .env y no se imprimen.'

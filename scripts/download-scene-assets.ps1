$ErrorActionPreference = 'Stop'
$taskDestination = Join-Path (Split-Path -Parent $PSScriptRoot) 'frontend/public/smart-assets'
function Save-VerifiedAsset($Asset, [string]$Path) {
    if (([uri]$Asset.url).Host -ne 'dl.polyhaven.org') { throw 'Origen de recurso no autorizado' }
    [IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
    if (-not (Test-Path -LiteralPath $Path)) { Invoke-WebRequest $Asset.url -UserAgent 'InstalaCamara-Development/1.0' -OutFile $Path }
    if ((Get-FileHash -LiteralPath $Path -Algorithm MD5).Hash.ToLowerInvariant() -ne $Asset.md5) { throw ('Recurso alterado: ' + $Path) }
}
foreach ($taskId in @('sofa_02', 'sofa_03', 'fern_02', 'potted_plant_04')) {
    $taskFiles = Invoke-RestMethod ('https://api.polyhaven.com/files/' + $taskId) -UserAgent 'InstalaCamara-Development/1.0'
    $taskModel = $taskFiles.gltf.'1k'.gltf
    Save-VerifiedAsset $taskModel (Join-Path $taskDestination ($taskId + '/model.gltf'))
    foreach ($taskFile in $taskModel.include.PSObject.Properties) {
        if ($taskFile.Name.Contains('..') -or [IO.Path]::IsPathRooted($taskFile.Name)) { throw 'Ruta de recurso inválida' }
        Save-VerifiedAsset $taskFile.Value (Join-Path $taskDestination ($taskId + '/' + $taskFile.Name))
    }
}
$taskFiles = Invoke-RestMethod 'https://api.polyhaven.com/files/wood_floor' -UserAgent 'InstalaCamara-Development/1.0'
foreach ($taskMap in @('Diffuse', 'nor_gl', 'Rough')) {
    Save-VerifiedAsset $taskFiles.$taskMap.'1k'.jpg (Join-Path $taskDestination ('wood-' + $taskMap + '.jpg'))
}
Write-Output 'Modelos y materiales CC0 descargados y verificados.'

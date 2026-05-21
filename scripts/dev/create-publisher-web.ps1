<#
Creates the publisher-web application structure
#>

$base = "C:\cm-platform\apps\publisher-web"

Write-Host "Creating publisher-web structure..." -ForegroundColor Cyan

$folders = @(
    "$base",
    "$base\src",
    "$base\src\pages",
    "$base\src\lib",
    "$base\src\components",
    "$base\public",
    "$base\public\styles"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Write-Host "Created: $folder"
}

Write-Host ""
Write-Host "publisher-web structure created." -ForegroundColor Green
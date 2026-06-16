$ErrorActionPreference = "Stop"

$baseUrl = $env:PROD_LOCAL_BASE_URL

if (-not $baseUrl) {
    $baseUrl = "http://localhost:8080"
}

function Invoke-SmokeRequest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [int]$ExpectedStatusCode,

        [string]$ExpectedContent
    )

    $uri = "$baseUrl$Path"
    Write-Host "Checking $uri"

    try {
        $response = Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -TimeoutSec 20
        $statusCode = [int]$response.StatusCode
        $content = $response.Content
    } catch {
        $webResponse = $_.Exception.Response

        if (-not $webResponse) {
            throw
        }

        $statusCode = [int]$webResponse.StatusCode
        $reader = [System.IO.StreamReader]::new($webResponse.GetResponseStream())
        try {
            $content = $reader.ReadToEnd()
        } finally {
            $reader.Dispose()
        }
    }

    if ($statusCode -ne $ExpectedStatusCode) {
        throw "Expected $ExpectedStatusCode from $Path but received $statusCode. Body: $content"
    }

    if ($ExpectedContent -and $content -notlike "*$ExpectedContent*") {
        throw "Expected response from $Path to contain '$ExpectedContent'. Body: $content"
    }
}

Invoke-SmokeRequest -Path "/" -ExpectedStatusCode 200 -ExpectedContent "CM Platform"
Invoke-SmokeRequest -Path "/health" -ExpectedStatusCode 200 -ExpectedContent '"ok":true'
Invoke-SmokeRequest -Path "/ready" -ExpectedStatusCode 200 -ExpectedContent '"ok":true'
Invoke-SmokeRequest -Path "/auth/me" -ExpectedStatusCode 401
Invoke-SmokeRequest -Path "/platform/status" -ExpectedStatusCode 200

Write-Host "Production-like local smoke test passed."

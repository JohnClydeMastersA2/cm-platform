$headers = @{ "x-admin-key" = "changeme-internal-key" }
$baseUrl = "http://localhost:3000"

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

$health = Invoke-RestMethod "$baseUrl/health"
Assert-True ($health.ok -eq $true) "Health check failed"

$ready = Invoke-RestMethod "$baseUrl/ready"
Assert-True ($ready.ok -eq $true) "Ready check failed"

$advertisers = Invoke-RestMethod "$baseUrl/internal/advertisers" -Headers $headers
Assert-True ($advertisers.Count -gt 0) "Expected advertisers"
Assert-True ($null -ne $advertisers[0].advertiserId) "Expected advertiserId"

$offers = Invoke-RestMethod "$baseUrl/internal/offers" -Headers $headers
Assert-True ($offers.Count -gt 0) "Expected offers"
Assert-True ($null -ne $offers[0].offerId) "Expected offerId"

$publishers = Invoke-RestMethod "$baseUrl/internal/publishers" -Headers $headers
Assert-True ($publishers.Count -gt 0) "Expected publishers"
Assert-True ($null -ne $publishers[0].publisherId) "Expected publisherId"

Write-Host "All internal API smoke tests passed" -ForegroundColor Green
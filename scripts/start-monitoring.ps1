$project = "C:\Users\siddh\OneDrive\Desktop\projects\kubeshield-enterprise-starter"

Set-Location $project

$key = [Environment]::GetEnvironmentVariable(
    "KUBESHIELD_SUPABASE_KEY",
    "User"
)

if ([string]::IsNullOrWhiteSpace($key)) {
    Write-Host "Supabase key not configured."
    exit 1
}

$env:KUBESHIELD_SUPABASE_KEY = $key
Remove-Variable key

while ($true) {
    try {
        & "$project\scripts\publish-metrics.ps1"
    }
    catch {
        Write-Host "Publisher error. Retrying in 60 seconds."
    }

    Start-Sleep -Seconds 60
}

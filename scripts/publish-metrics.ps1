$ErrorActionPreference = "Stop"

$base = "http://127.0.0.1:9090"
$supabase = "https://oshfktsokusmxkdxjnif.supabase.co"
$key = $env:KUBESHIELD_SUPABASE_KEY

if (-not $key -or -not $key.StartsWith("sb_secret_")) {
    throw "Supabase secret key is not loaded."
}

function Get-PrometheusData {
    param([string]$Query, [bool]$History = $false)

    if ($History) {
        $end = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        $start = $end - 3600
        $path = "/api/v1/query_range?query=$([uri]::EscapeDataString($Query))&start=$start&end=$end&step=60"
    } else {
        $path = "/api/v1/query?query=$([uri]::EscapeDataString($Query))"
    }

    $result = Invoke-RestMethod -Uri "$base$path" -TimeoutSec 10

    if ($result.status -ne "success") {
        throw "Prometheus query failed."
    }

    return $result.data.result
}

function Get-Value {
    param([string]$Query)

    $result = @(Get-PrometheusData -Query $Query)

    if ($result.Count -eq 0) {
        return $null
    }

    $number = 0.0

    if ([double]::TryParse(
        [string]$result[0].value[1],
        [System.Globalization.NumberStyles]::Float,
        [System.Globalization.CultureInfo]::InvariantCulture,
        [ref]$number
    )) {
        if (-not [double]::IsNaN($number) -and -not [double]::IsInfinity($number)) {
            return $number
        }
    }

    return $null
}

function Get-History {
    param([string]$Query, [string]$Field)

    $result = @(Get-PrometheusData -Query $Query -History $true)
    $points = @()

    if ($result.Count -eq 0) {
        return ,$points
    }

    foreach ($item in $result[0].values) {
        $number = 0.0
        $valid = [double]::TryParse(
            [string]$item[1],
            [System.Globalization.NumberStyles]::Float,
            [System.Globalization.CultureInfo]::InvariantCulture,
            [ref]$number
        )

        if ($valid -and -not [double]::IsNaN($number) -and -not [double]::IsInfinity($number)) {
            $time = [DateTimeOffset]::FromUnixTimeSeconds([long]$item[0]).UtcDateTime.ToString("HH:mm")
            $points += @{ time = $time; $Field = $number }
        }
    }

    return ,$points
}

$traffic = 'sum(rate(kubeshield_http_requests_total{job="kubeshield-metrics"}[5m]))'
$latency = '1000 * sum(rate(kubeshield_http_request_duration_seconds_sum{job="kubeshield-metrics"}[5m])) / sum(rate(kubeshield_http_request_duration_seconds_count{job="kubeshield-metrics"}[5m]))'

$replicas = Get-Value 'sum(up{job="kubeshield-metrics"})'
$requests = Get-Value $traffic
$trafficHistory = Get-History $traffic "requests"
$latencyHistory = Get-History $latency "latency"

$payload = @{
    healthy_replicas = $replicas
    requests_per_second = $requests
    traffic_history = @($trafficHistory)
    latency_history = @($latencyHistory)
} | ConvertTo-Json -Depth 10 -Compress

$headers = @{
    "apikey" = $key
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
    "User-Agent" = "KubeShield-Monitor/1.0"
}

Invoke-RestMethod `
    -Uri "$supabase/rest/v1/kubeshield_metrics" `
    -Method Post `
    -Headers $headers `
    -Body $payload `
    -TimeoutSec 15 | Out-Null

Write-Host "METRICS UPLOADED SUCCESSFULLY"
Write-Host "Healthy replicas: $replicas"
Write-Host "Requests per second: $requests"
Write-Host "Traffic history points: $($trafficHistory.Count)"
Write-Host "Latency history points: $($latencyHistory.Count)"

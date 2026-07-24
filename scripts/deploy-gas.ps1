$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $repoRoot
$envPath = Join-Path $repoRoot ".env.local"
$claspConfig = Join-Path $repoRoot ".clasp.json"

function Fail($message) {
    Write-Host "ERROR: $message"
    exit 1
}

function ExtractEnvValue($lines, $key) {
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ($trimmed -like "$key=*") {
            $parts = $trimmed -split '=', 2
            if ($parts.Count -ge 2) {
                return $parts[1].Trim('"').Trim()
            }
        }
    }
    return $null
}

function SetEnvValue($path, $key, $value) {
    $lines = Get-Content $path -ErrorAction Stop
    $updated = $false
    $output = foreach ($line in $lines) {
        if ($line -match "^\s*$([regex]::Escape($key))\s*=") {
            $updated = $true
            "$key=$value"
        } else {
            $line
        }
    }
    if (-not $updated) {
        $output += "$key=$value"
    }
    Set-Content -Path $path -Value $output -Encoding UTF8
}

if (-not (Get-Command clasp -ErrorAction SilentlyContinue)) {
    Fail "clasp is not installed."
}
if (-not (Test-Path -Path $claspConfig -PathType Leaf)) {
    Fail ".clasp.json is missing."
}
if (-not (Test-Path -Path $envPath -PathType Leaf)) {
    Fail ".env.local is missing."
}

$envLines = Get-Content $envPath -ErrorAction Stop
$deploymentId = ExtractEnvValue $envLines 'GAS_DEPLOYMENT_ID'
if (-not $deploymentId) {
    Fail "GAS_DEPLOYMENT_ID is missing in .env.local."
}
$gasApiUrl = ExtractEnvValue $envLines 'GAS_API_URL'
if (-not $gasApiUrl) {
    Fail "GAS_API_URL is missing in .env.local."
}

$temporaryWorkspace = Join-Path $env:TEMP ("gas-deploy-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporaryWorkspace | Out-Null
try {
    Copy-Item .clasp.json, appsscript.json -Destination $temporaryWorkspace -Force

    $backendGsFiles = Get-ChildItem -Path (Join-Path $repoRoot 'backend') -Filter '*.gs' -File
    if (-not $backendGsFiles) {
        Fail "No backend .gs files were found in '$repoRoot\backend'."
    }
    foreach ($file in $backendGsFiles) {
        Copy-Item -Path $file.FullName -Destination $temporaryWorkspace -Force
    }

    Push-Location $temporaryWorkspace

    $statusOutput = clasp status 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host $statusOutput; Fail "clasp status failed." }

    $pushOutput = clasp push 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host $pushOutput; Fail "clasp push failed." }

    $versionOutput = clasp version "Auto deploy" 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host $versionOutput; Fail "clasp version failed." }

    $deployOutput = clasp deploy --deploymentId $deploymentId 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host $deployOutput; Fail "clasp deploy failed." }

    $deployedDeploymentId = $deploymentId
    $deployedWebAppUrl = if ($gasApiUrl.Contains('?')) { "$gasApiUrl" } else { $gasApiUrl }

    SetEnvValue $envPath 'GAS_DEPLOYMENT_ID' $deployedDeploymentId
    SetEnvValue $envPath 'GAS_API_URL' $deployedWebAppUrl

    $separator = '?'
    if ($deployedWebAppUrl.Contains('?')) { $separator = '&' }
    $healthUrl = "$deployedWebAppUrl${separator}path=health"
    $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 15 -UseBasicParsing
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        Write-Host "HTTP status: $($response.StatusCode)"
        Fail "Health check failed." 
    }
    Write-Host "Deployment verified."
} finally {
    Pop-Location
    Remove-Item -Recurse -Force -Path $temporaryWorkspace
}

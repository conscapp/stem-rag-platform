# Push backend/.env vars to linked Railway service (production CORS).
# Prereq: railway login && railway link (from repo root or backend)
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$envFile = Join-Path $repoRoot "backend\.env"
if (-not (Test-Path $envFile)) { throw "Missing $envFile" }

$vars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $vars[$line.Substring(0, $i)] = $line.Substring($i + 1)
}

$vars["CORS_ORIGINS"] = "https://conscrag.com,https://www.conscrag.com,https://stem-rag-platform.vercel.app,http://localhost:3000,http://127.0.0.1:3000"
$vars["CORS_ORIGIN_REGEX"] = "https://.*\.vercel\.app"

railway whoami | Out-Null
Write-Host "Setting $($vars.Count) variables on Railway..."
foreach ($key in $vars.Keys) {
    railway variable set "${key}=$($vars[$key])" --skip-deploys | Out-Null
    Write-Host "  ok $key"
}
Write-Host "Done. Railway will redeploy on next save or run: railway up"

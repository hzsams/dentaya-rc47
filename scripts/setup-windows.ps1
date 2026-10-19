$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Get-Major([string]$Version) {
  $clean = $Version.Trim().TrimStart('v')
  return [int]($clean.Split('.')[0])
}

Write-Host ""
Write-Host "DentAYA RC29 Windows Setup" -ForegroundColor Cyan
Write-Host "Project: $Root"

try { $nodeVersion = (& node --version).Trim() } catch {
  throw "Node.js bulunamadi. Node.js 22.x kurup PowerShell'i yeniden acin."
}
if ((Get-Major $nodeVersion) -lt 22) {
  throw "Node.js 22+ gerekli. Mevcut: $nodeVersion"
}
Write-Host "PASS Node.js $nodeVersion" -ForegroundColor Green

try { $npmVersion = (& npm.cmd --version).Trim() } catch {
  throw "npm bulunamadi. Node.js kurulumunu kontrol edin."
}
if ((Get-Major $npmVersion) -lt 11) {
  Write-Host "npm $npmVersion bulundu; RC29 npm 11+ istiyor. npm 11 kuruluyor..." -ForegroundColor Yellow
  & npm.cmd install -g npm@11
  if ($LASTEXITCODE -ne 0) { throw "npm 11 otomatik kurulamadı. PowerShell'i yonetici olarak acip 'npm.cmd install -g npm@11' calistirin." }
  $npmVersion = (& npm.cmd --version).Trim()
}
if ((Get-Major $npmVersion) -lt 11) { throw "npm 11+ gerekli. Mevcut: $npmVersion" }
Write-Host "PASS npm $npmVersion" -ForegroundColor Green

Write-Host "Bagimliliklar package-lock ile kuruluyor (npm ci)..." -ForegroundColor Cyan
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "npm ci basarisiz." }

if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.release.example" ".env.local"
  Write-Host "OLUSTURULDU .env.local" -ForegroundColor Yellow
  Write-Host "Supabase ve Google Maps degerlerini .env.local icine girmeniz gerekiyor." -ForegroundColor Yellow
} else {
  Write-Host "PASS .env.local zaten mevcut" -ForegroundColor Green
}

Write-Host "RC29 statik pilot adayi kontrolleri..." -ForegroundColor Cyan
& npm.cmd run verify:release
if ($LASTEXITCODE -ne 0) { throw "verify:release basarisiz." }
& npm.cmd run verify:security
if ($LASTEXITCODE -ne 0) { throw "verify:security basarisiz." }
& npm.cmd run verify:performance
if ($LASTEXITCODE -ne 0) { throw "verify:performance basarisiz." }
& npm.cmd run verify:pilot
if ($LASTEXITCODE -ne 0) { throw "verify:pilot basarisiz." }

Write-Host ""
Write-Host "SETUP ASAMASI TAMAM." -ForegroundColor Green
Write-Host "1) .env.local icindeki Supabase + Maps anahtarlarini doldurun."
Write-Host "2) npm.cmd run verify:env"
Write-Host "3) npm.cmd run verify:final"
Write-Host "4) npm.cmd run dev"
Write-Host ""
Write-Host "Not: npm install-scripts bir paket icin onay isterse once 'npm install-scripts ls' ile inceleyin; otomatik onay vermeyin." -ForegroundColor Yellow

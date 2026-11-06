# PowerShell Script to generate a self-signed certificate for local MSIX development and sideloading
param (
    [string]$Publisher = "CN=OlaiDigitalStudios",
    [string]$CertName = "FlapcryptDevCert",
    [string]$OutPfx = "src-tauri/gen/windows/FlapcryptDev.pfx",
    [string]$Password = "Password123!"
)

$ErrorActionPreference = "Stop"

Write-Host "Creating self-signed certificate for Publisher: $Publisher..." -ForegroundColor Cyan

$securePassword = ConvertTo-SecureString $Password -AsPlainText -Force

# Generate self-signed code signing certificate
$cert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject $Publisher `
    -KeyUsage DigitalSignature `
    -FriendlyName $CertName `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256

Write-Host "Certificate created with thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

# Ensure target folder exists
$outDir = Split-Path -Parent $OutPfx
if ($outDir -and -not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

# Export PFX
Export-PfxCertificate `
    -Cert $cert `
    -FilePath $OutPfx `
    -Password $securePassword | Out-Null

Write-Host "Exported PFX to: $OutPfx" -ForegroundColor Green
Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To trust this certificate for local sideloading installation:" -ForegroundColor Cyan
Write-Host "  Import-Certificate -FilePath `"$OutPfx`" -CertStoreLocation Cert:\CurrentUser\Root" -ForegroundColor Gray
Write-Host ""
Write-Host "To configure bundle.config.json for local signing:" -ForegroundColor Cyan
Write-Host "  Set `"signing`": { `"pfx`": `"$OutPfx`", `"pfxPassword`": `"$Password`" }" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: Microsoft Partner Center will re-sign packages automatically upon Store ingestion." -ForegroundColor Yellow

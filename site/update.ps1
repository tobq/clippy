$ErrorActionPreference = "Stop"

$AppDir = if ($env:BOARDCLIP_APP_DIR) { $env:BOARDCLIP_APP_DIR } else { Join-Path $env:LOCALAPPDATA "BoardClip" }

if (-not (Test-Path (Join-Path $AppDir ".git"))) {
  throw "BoardClip is not installed at $AppDir. Install it with: irm https://boardclip.sh/install.ps1 | iex"
}

Set-Location $AppDir
& (Join-Path $AppDir "update.bat")

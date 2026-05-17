$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:BOARDCLIP_REPO_URL) { $env:BOARDCLIP_REPO_URL } else { "https://github.com/tobq/boardclip.git" }
$AppDir = if ($env:BOARDCLIP_APP_DIR) { $env:BOARDCLIP_APP_DIR } else { Join-Path $env:LOCALAPPDATA "BoardClip" }

function Need($Command) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Command. Install it, then run this installer again."
  }
}

Need git

if (Test-Path (Join-Path $AppDir ".git")) {
  Write-Host "BoardClip is already installed in $AppDir"
  Write-Host "Running the standard update flow..."
  Set-Location $AppDir
  & (Join-Path $AppDir "update.bat")
  exit $LASTEXITCODE
} elseif (Test-Path $AppDir) {
  throw "Cannot install BoardClip: $AppDir already exists but is not a git checkout. Move it aside or set BOARDCLIP_APP_DIR to another directory."
} else {
  Need npm
  Write-Host "Installing BoardClip to $AppDir"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $AppDir) | Out-Null
  git clone $RepoUrl $AppDir
  Set-Location $AppDir
}

& (Join-Path $AppDir "install.bat")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $AppDir "start.bat")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "BoardClip is running."
Write-Host "Update later with:"
Write-Host "  irm https://boardclip.sh/update.ps1 | iex"

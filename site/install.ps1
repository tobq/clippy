$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:BOARDCLIP_REPO_URL) { $env:BOARDCLIP_REPO_URL } else { "https://github.com/tobq/boardclip.git" }
$AppDir = if ($env:BOARDCLIP_APP_DIR) { $env:BOARDCLIP_APP_DIR } else { Join-Path $env:LOCALAPPDATA "BoardClip" }

function Need($Command) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Command. Install it, then run this installer again."
  }
}

Need git
Need npm

if (Test-Path (Join-Path $AppDir ".git")) {
  Write-Host "Updating existing BoardClip install in $AppDir"
  Set-Location $AppDir
  git pull --rebase --autostash
} else {
  Write-Host "Installing BoardClip to $AppDir"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $AppDir) | Out-Null
  git clone $RepoUrl $AppDir
  Set-Location $AppDir
}

npm install
& (Join-Path $AppDir "start.bat")

Write-Host ""
Write-Host "BoardClip is running."
Write-Host "Update later with:"
Write-Host "  irm https://boardclip.sh/update.ps1 | iex"

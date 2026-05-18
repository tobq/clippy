$ErrorActionPreference = "Stop"

$AppDir = if ($env:BOARDCLIP_APP_DIR) { $env:BOARDCLIP_APP_DIR } else { Join-Path $env:LOCALAPPDATA "BoardClip" }

if (-not (Test-Path (Join-Path $AppDir ".git"))) {
  throw "BoardClip is not installed at $AppDir. Install it with: irm https://boardclip.sh/install.ps1 | iex"
}

Set-Location $AppDir
$PreviousAllowDirty = $env:BOARDCLIP_UPDATE_ALLOW_DIRTY
$env:BOARDCLIP_UPDATE_ALLOW_DIRTY = "1"
try {
  & (Join-Path $AppDir "update.bat")
  $Code = $LASTEXITCODE
} finally {
  if ($null -eq $PreviousAllowDirty) {
    Remove-Item Env:\BOARDCLIP_UPDATE_ALLOW_DIRTY -ErrorAction SilentlyContinue
  } else {
    $env:BOARDCLIP_UPDATE_ALLOW_DIRTY = $PreviousAllowDirty
  }
}
exit $Code

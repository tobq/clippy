$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "assets\boardclip-icon.png"

Add-Type -AssemblyName System.Drawing

function Save-ResizedPng {
  param(
    [System.Drawing.Image]$SourceImage,
    [int]$Size,
    [string]$OutputPath
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($SourceImage, 0, 0, $Size, $Size)
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

if (-not (Test-Path $Source)) {
  throw "Missing canonical icon source: $Source"
}

$image = [System.Drawing.Image]::FromFile($Source)
try {
  if ($image.Width -ne $image.Height) {
    throw "Canonical icon must be square. Found $($image.Width)x$($image.Height)."
  }
  if ($image.Width -lt 512) {
    throw "Canonical icon must be at least 512x512. Found $($image.Width)x$($image.Height)."
  }

  Save-ResizedPng $image 512 (Join-Path $Root "icon@2x.png")
  Save-ResizedPng $image 256 (Join-Path $Root "icon.png")
  Save-ResizedPng $image 256 (Join-Path $Root "site\favicon.png")
} finally {
  $image.Dispose()
}

Write-Host "Synced BoardClip icons from assets\boardclip-icon.png"

@echo off
setlocal

set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"

:: Kill only the Electron processes that belong to this checkout, then wait
:: until Windows has actually removed them from the process table.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$target = [IO.Path]::GetFullPath($env:ELECTRON_EXE); $deadline = (Get-Date).AddSeconds(10); while ($true) { $running = @(Get-Process electron -ErrorAction SilentlyContinue | Where-Object { try { $_.Path -and ([IO.Path]::GetFullPath($_.Path) -ieq $target) } catch { $false } }); if ($running.Count -eq 0) { exit 0 }; $running | Stop-Process -Force -ErrorAction SilentlyContinue; if ((Get-Date) -ge $deadline) { exit 1 }; Start-Sleep -Milliseconds 500 }" 2>nul
if errorlevel 1 (
  echo ERROR: Failed to stop Clipboard Tray.
  exit /b 1
)

echo Clipboard tray stopped.

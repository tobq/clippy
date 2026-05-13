@echo off
setlocal

set "APP_DIR=%~dp0"
set "ELECTRON_EXE=%APP_DIR%node_modules\electron\dist\electron.exe"

:: Kill any existing instance first
call "%~dp0kill.bat"
if errorlevel 1 exit /b 1

if not exist "%ELECTRON_EXE%" (
  echo Electron is not installed. Run install.bat first.
  exit /b 1
)

:: Start Electron in background from the app directory.
cd /d "%APP_DIR%"
start "" /B "%ELECTRON_EXE%" .
echo Clipboard tray started.

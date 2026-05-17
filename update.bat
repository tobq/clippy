@echo off
setlocal

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo Updating BoardClip...

where git >nul 2>&1
if errorlevel 1 (
  echo Git is not installed or not on PATH.
  exit /b 1
)

set "BEFORE="
for /f %%i in ('git rev-parse HEAD 2^>nul') do set "BEFORE=%%i"

git pull --rebase --autostash
if errorlevel 1 (
  echo Update failed during git pull.
  exit /b 1
)

set "AFTER="
for /f %%i in ('git rev-parse HEAD 2^>nul') do set "AFTER=%%i"

set "NEED_INSTALL="
if not exist "%APP_DIR%node_modules\electron\dist\electron.exe" set "NEED_INSTALL=1"
if defined BEFORE if defined AFTER if not "%BEFORE%"=="%AFTER%" (
  for /f %%f in ('git diff --name-only %BEFORE% %AFTER% -- package.json package-lock.json 2^>nul') do set "NEED_INSTALL=1"
)

if defined NEED_INSTALL (
  where npm >nul 2>&1
  if errorlevel 1 (
    echo npm is not installed or not on PATH.
    exit /b 1
  )

  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency install failed.
    exit /b 1
  )
) else (
  echo Dependencies unchanged.
)

call "%APP_DIR%start.bat"
if errorlevel 1 exit /b 1

echo Update complete.

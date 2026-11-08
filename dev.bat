@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Install Node.js 22.12+ and pnpm first.
  popd
  exit /b 1
)
node scripts\run.mjs dev %*
set "APP_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %APP_EXIT_CODE%

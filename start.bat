@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js суугаагүй байна. https://nodejs.org хаягаас LTS хувилбарыг суулгаад дахин ажиллуулна уу.
  pause
  exit /b 1
)
if exist .env (
  for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
)
if "%PAYMENT_PROVIDER%"=="" echo Туршилтын горим: жинхэнэ мөнгө хөдөлхгүй. QPay-д холбохын тулд .env файл үүсгэнэ үү.
start "" http://localhost:3000
node server.js
pause

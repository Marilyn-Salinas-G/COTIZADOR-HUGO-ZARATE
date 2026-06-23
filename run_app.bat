@echo off
title Cotizador - Hugo Zarate Publicidad
echo ==========================================================
echo    INICIANDO EL COTIZADOR - HUGO ZARATE PUBLICIDAD
echo ==========================================================
echo.

:: Check if Node.js is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Node.js no esta en el PATH. Buscando en la ruta por defecto...
    if exist "C:\Program Files\nodejs\node.exe" (
        echo [OK] Node.js encontrado en C:\Program Files\nodejs
        set "PATH=%PATH%;C:\Program Files\nodejs"
    ) else (
        echo [INFO] Node.js no esta instalado. Instalando mediante winget...
        echo.
        winget install --id OpenJS.NodeJS --silent --accept-package-agreements --accept-source-agreements
        if %errorlevel% neq 0 (
            echo [ERROR] No se pudo instalar Node.js automaticamente. 
            echo Por favor instala Node.js manualmente desde https://nodejs.org/
            pause
            exit /b 1
        )
        echo [OK] Node.js instalado con exito.
        set "PATH=%PATH%;C:\Program Files\nodejs"
    )
) else (
    echo [OK] Node.js detectado.
)

:: Validate npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se detecto npm en el sistema.
    echo Por favor asegurese de tener Node.js correctamente instalado.
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo    INSTALANDO DEPENDENCIAS (npm install)...
echo ==========================================================
call npm install

echo.
echo ==========================================================
echo    PREPARANDO LOGO Y FIRMA (PowerShell)...
echo ==========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0setup_images.ps1"

echo.
echo ==========================================================
echo    INICIANDO EL SERVIDOR WEB LOCAL...
echo ==========================================================
echo La aplicacion estara disponible en: http://localhost:3000
echo Compartelo en tu red local usando tu direccion IP.
echo.
echo Presiona Ctrl+C en esta consola para apagar el cotizador.
echo ==========================================================
echo.

:: Open browser automatically
start http://localhost:3000

:: Run node server
node server.js

pause

@echo off
title School Management System

echo ========================================
echo    SCHOOL MANAGEMENT SYSTEM
echo ========================================
echo.

set "PROJECT=%~dp0"

echo Starting Backend...
start "School Backend" powershell -NoExit -Command "cd '%PROJECT%management'; .\mvnw.cmd spring-boot:run"

timeout /t 8 /nobreak >nul

echo Starting Frontend...
start "School Frontend" powershell -NoExit -Command "cd '%PROJECT%school-frontend'; npx ng serve"

timeout /t 5 /nobreak >nul

echo Opening Website...
start http://localhost:4200

echo.
echo Both servers are starting!
echo Keep both terminal windows open.
pause
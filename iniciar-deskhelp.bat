@echo off
echo Iniciando DeskHelp...
echo.

echo 1. Parando processos anteriores...
taskkill /f /im node.exe 2>nul

echo 2. Iniciando Backend...
cd /d "c:\Users\enric\Documents\deskhelp\src\database"
start "DeskHelp Backend" cmd /k "node index.js"

echo 3. Aguardando backend iniciar...
timeout /t 5 /nobreak >nul

echo 4. Iniciando Frontend...
cd /d "c:\Users\enric\Documents\deskhelp"
start "DeskHelp Frontend" cmd /k "npm start"

echo.
echo DeskHelp iniciado!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause

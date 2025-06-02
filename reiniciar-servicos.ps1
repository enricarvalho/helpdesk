# Script para reiniciar serviços DeskHelp e limpar cache
# Uso: Execute este script no PowerShell na raiz do projeto DeskHelp

Write-Host "Encerrando processos Node.js e React..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process "cmd" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*npm*start*' } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Limpando cache do npm e build do frontend..."
npm cache clean --force
Remove-Item -Recurse -Force .\build 2>$null

Write-Host "Instalando dependências do backend e frontend..."
cd .\src\database
npm install
cd ..\..

npm install

Write-Host "Iniciando backend (DeskHelp)..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd src/database; node index.js'

Write-Host "Iniciando frontend React..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'npm start'

Write-Host "Pronto! Backend e frontend reiniciados."

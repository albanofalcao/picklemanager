@echo off
echo Iniciando PickleManager...
start http://127.0.0.1:8090
pocketbase.exe serve --http=127.0.0.1:8090
pause

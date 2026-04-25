@echo off
echo ==========================================
echo   ПУТЬ ВОЛШЕБНИКА - Запуск на Windows
echo ==========================================
echo.

REM Проверяем наличие .env файла
if not exist ".env" (
    echo [ОШИБКА] Файл .env не найден!
    echo.
    echo Создайте файл .env в корне проекта:
    echo   copy .env.example .env
    echo Затем откройте .env и вставьте строку подключения к базе данных.
    echo.
    pause
    exit /b 1
)

REM Проверяем наличие node_modules
if not exist "node_modules" (
    echo [INFO] Устанавливаем зависимости...
    pnpm install
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить зависимости!
        pause
        exit /b 1
    )
)

echo [INFO] Запускаем API сервер...
start "API Сервер - Путь волшебника" cmd /k "pnpm --filter @wizard-path/api-server run dev"

echo [INFO] Ждём запуска сервера (3 секунды)...
timeout /t 3 /nobreak >nul

echo [INFO] Запускаем игру...
start "Игра - Путь волшебника" cmd /k "pnpm --filter @wizard-path/wizard-path run dev"

echo.
echo ==========================================
echo   Готово! Открываются два окна:
echo   1. API Сервер  (порт 8080)
echo   2. Игра        (порт 5173)
echo.
echo   Откройте в браузере:
echo   http://localhost:5173
echo ==========================================
echo.
echo После запуска нажмите любую клавишу...
pause >nul

REM Открываем браузер автоматически
start "" "http://localhost:5173"

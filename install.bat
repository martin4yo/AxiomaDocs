@echo off
echo =====================================
echo  Axioma Docs - Installation Script
echo =====================================

echo Installing root dependencies...
call npm install
if errorlevel 1 (
    echo Error installing root dependencies
    pause
    exit /b 1
)

echo.
echo Installing server dependencies...
cd server
call npm install
if errorlevel 1 (
    echo Error installing server dependencies
    pause
    exit /b 1
)

echo.
echo Installing client dependencies...
cd ..\client
call npm install
if errorlevel 1 (
    echo Error installing client dependencies
    pause
    exit /b 1
)

echo.
echo Creating environment files...
cd ..
if not exist "client\.env" (
    copy "client\.env.example" "client\.env"
    echo Client .env file created
)

echo.
echo =====================================
echo  Installation completed successfully!
echo =====================================
echo.
echo To start the development server:
echo   npm run dev
echo.
echo To start in production:
echo   npm run build
echo   npm start
echo.
echo Access the application at: http://localhost:3000
echo.
pause
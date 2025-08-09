#!/bin/bash

echo "====================================="
echo " Axioma Docs - Installation Script"
echo "====================================="

echo "Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error installing root dependencies"
    exit 1
fi

echo ""
echo "Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "Error installing server dependencies"
    exit 1
fi

echo ""
echo "Installing client dependencies..."
cd ../client
npm install
if [ $? -ne 0 ]; then
    echo "Error installing client dependencies"
    exit 1
fi

echo ""
echo "Creating environment files..."
cd ..
if [ ! -f "client/.env" ]; then
    cp "client/.env.example" "client/.env"
    echo "Client .env file created"
fi

echo ""
echo "====================================="
echo " Installation completed successfully!"
echo "====================================="
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "To start in production:"
echo "  npm run build"
echo "  npm start"
echo ""
echo "Access the application at: http://localhost:3000"
echo ""
#!/bin/bash

echo "Setting up Presentation Generator Platform..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install
cd ..

# Install AI service dependencies
echo "Installing AI service dependencies..."
cd ai-service && pip install -r requirements.txt
cd ..

echo "Setup complete!"

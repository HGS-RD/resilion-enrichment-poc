#!/bin/bash
set -e

echo "Installing root dependencies..."
npm install

echo "Changing to web app directory..."
cd apps/web

echo "Installing web app dependencies..."
npm install

echo "Building web app..."
npm run build

echo "Build completed successfully!"

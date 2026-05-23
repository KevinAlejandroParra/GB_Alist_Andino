#!/bin/bash
# Script para reparar Sharp en el servidor

echo "🔧 Reparando instalación de Sharp..."
cd "$(dirname "$0")"

echo "1️⃣ Eliminando Sharp corrupto..."
npm uninstall sharp

echo "2️⃣ Limpiando cache de npm..."
npm cache clean --force

echo "3️⃣ Reinstalando Sharp..."
npm install sharp --save

echo ""
echo "✅ Sharp reinstalado"
echo "🔄 Reinicia el servidor con: pm2 restart api-andino"

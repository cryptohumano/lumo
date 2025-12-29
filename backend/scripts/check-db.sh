#!/bin/bash

# Script para verificar la conexión a la base de datos

set -e

echo "🔍 Verificando conexión a la base de datos..."

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Extraer información de DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL no está definida en .env"
    exit 1
fi

# Intentar conectar
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa a la base de datos"
    psql "$DATABASE_URL" -c "SELECT version();" | head -3
    exit 0
else
    echo "❌ No se pudo conectar a la base de datos"
    echo ""
    echo "💡 Verifica:"
    echo "   1. PostgreSQL está instalado y corriendo"
    echo "   2. La base de datos 'operations' existe"
    echo "   3. Las credenciales en .env son correctas"
    echo ""
    echo "📖 Ver SETUP.md para instrucciones de instalación"
    exit 1
fi






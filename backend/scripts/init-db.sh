#!/bin/bash

# Script completo para inicializar la base de datos

set -e

echo "🚀 Inicializando base de datos..."

# Verificar que estamos en el directorio correcto
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ No se encontró prisma/schema.prisma"
    echo "💡 Ejecuta este script desde el directorio backend/"
    exit 1
fi

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Archivo .env no encontrado"
    echo "💡 Copia .env.example a .env y configura DATABASE_URL"
    exit 1
fi

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL no está definida en .env"
    exit 1
fi

echo "📦 Generando cliente de Prisma..."
yarn prisma:generate

echo ""
echo "🔍 Verificando conexión a la base de datos..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa"
else
    echo "❌ No se pudo conectar a la base de datos"
    echo ""
    echo "💡 Asegúrate de que:"
    echo "   1. PostgreSQL está instalado y corriendo"
    echo "   2. La base de datos existe (ejecuta: createdb operations)"
    echo "   3. Las credenciales en .env son correctas"
    echo ""
    echo "📖 Ver SETUP.md para más detalles"
    exit 1
fi

echo ""
echo "📊 Ejecutando migraciones..."
yarn prisma:migrate dev --name init

echo ""
echo "🌱 ¿Deseas poblar la base de datos con datos de ejemplo? (s/n)"
read -r response
if [[ "$response" =~ ^[sS]$ ]]; then
    echo "🌱 Poblando base de datos..."
    yarn prisma:seed
    echo ""
    echo "✅ Datos de ejemplo creados:"
    echo "   - Admin: admin@edimburgo.cl / admin123"
    echo "   - Conductor: conductor@edimburgo.cl / driver123"
fi

echo ""
echo "✨ Base de datos inicializada exitosamente!"
echo ""
echo "📊 Para ver la base de datos en Prisma Studio:"
echo "   yarn prisma:studio"






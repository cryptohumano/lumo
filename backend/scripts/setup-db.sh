#!/bin/bash

# Script para configurar la base de datos PostgreSQL

set -e

echo "🔧 Configurando base de datos PostgreSQL..."

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado."
    echo "📦 Instalando PostgreSQL..."
    
    # Detectar sistema operativo
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            echo "Instalando con apt-get..."
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
        elif command -v yum &> /dev/null; then
            echo "Instalando con yum..."
            sudo yum install -y postgresql postgresql-server
        else
            echo "❌ No se pudo detectar el gestor de paquetes. Instala PostgreSQL manualmente."
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Instalando con Homebrew..."
            brew install postgresql
            brew services start postgresql
        else
            echo "❌ Homebrew no está instalado. Instala PostgreSQL manualmente."
            exit 1
        fi
    else
        echo "❌ Sistema operativo no soportado. Instala PostgreSQL manualmente."
        exit 1
    fi
fi

echo "✅ PostgreSQL está instalado"

# Verificar si la base de datos existe
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw operations; then
    echo "✅ La base de datos 'operations' ya existe"
else
    echo "📊 Creando base de datos 'operations'..."
    
    # Intentar crear la base de datos
    if psql -U postgres -c "CREATE DATABASE operations;" 2>/dev/null; then
        echo "✅ Base de datos creada exitosamente"
    else
        echo "⚠️  No se pudo crear la base de datos automáticamente."
        echo "💡 Ejecuta manualmente:"
        echo "   sudo -u postgres psql"
        echo "   CREATE DATABASE operations;"
        echo "   \\q"
    fi
fi

echo ""
echo "✨ Configuración completada!"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Verifica que DATABASE_URL en .env sea correcta"
echo "   2. Ejecuta: yarn prisma:generate"
echo "   3. Ejecuta: yarn prisma:migrate dev --name init"
echo "   4. (Opcional) Ejecuta: yarn prisma:seed"






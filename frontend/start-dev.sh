#!/bin/bash

# Script para iniciar el servidor de desarrollo con la versión correcta de Node.js

# Cargar nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Usar la versión especificada en .nvmrc
if [ -f .nvmrc ]; then
  nvm use
else
  nvm use 22
fi

# Verificar versión
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Ejecutar Vite
exec npm run dev:direct


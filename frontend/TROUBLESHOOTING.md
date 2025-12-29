# Solución de Problemas - Frontend

## ❌ Error: "Cannot read properties of undefined (reading 'S')"

Este error indica un conflicto de versiones de React. 

### Solución:

1. **Actualizar Node.js a versión 22** (CRÍTICO):
   ```bash
   # Cargar nvm
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   
   # Instalar y usar Node.js 22
   nvm install 22
   nvm use 22
   nvm alias default 22
   
   # Verificar
   node --version  # Debe mostrar v22.x.x
   ```

2. **Limpiar e reinstalar dependencias**:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Verificar versiones de React**:
   ```bash
   npm list react react-dom
   ```
   
   Debe mostrar:
   - `react@19.2.0`
   - `react-dom@19.2.0`

## ⚠️ Problemas Comunes

### 1. Múltiples versiones de React en monorepo

Si hay conflictos, asegúrate de que el `package.json` del frontend tenga:
```json
{
  "dependencies": {
    "react": "19.2.0",
    "react-dom": "19.2.0"
  }
}
```

### 2. Node.js versión incorrecta

Vite 7 requiere Node.js >= 20.19.0 o >= 22.12.0. Usa nvm para cambiar de versión.

### 3. node_modules corruptos

Si persisten problemas:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## ✅ Verificación Final

Después de seguir los pasos:

1. Verifica Node.js: `node --version` (debe ser >= 22.12.0)
2. Verifica React: `npm list react react-dom` (debe ser 19.2.0)
3. Ejecuta: `npm run dev`
4. Abre el navegador en `http://localhost:5174`


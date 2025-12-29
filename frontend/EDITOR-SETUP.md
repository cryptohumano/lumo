# Configuración del Editor para Tailwind CSS 4

## 📝 Configuración Completada

Se ha configurado el editor según la [documentación oficial de Tailwind CSS](https://tailwindcss.com/docs/editor-setup).

## 🔧 Extensiones Recomendadas para VS Code

### 1. Tailwind CSS IntelliSense

**Extensión**: `bradlc.vscode-tailwindcss`

Esta extensión proporciona:
- ✅ **Autocompletado** - Sugerencias inteligentes para clases de utilidad
- ✅ **Linting** - Resalta errores en CSS y markup
- ✅ **Hover previews** - Muestra el CSS completo al pasar el mouse
- ✅ **Syntax highlighting** - Resalta correctamente la sintaxis personalizada de Tailwind

**Instalación**:
```bash
# Ya está en .vscode/extensions.json
# VS Code te sugerirá instalarla automáticamente
```

### 2. Prettier (con plugin de Tailwind)

**Extensión**: `esbenp.prettier-vscode`

**Plugin de Prettier para Tailwind**:
```bash
npm install -D prettier prettier-plugin-tailwindcss
```

Este plugin ordena automáticamente las clases de Tailwind siguiendo el orden recomendado.

## ⚙️ Configuración de VS Code

El archivo `.vscode/settings.json` está configurado con:

- ✅ Soporte para `cn()` y `cva()` (class-variance-authority)
- ✅ Validación CSS deshabilitada (para evitar errores con sintaxis personalizada de Tailwind)
- ✅ Asociación de archivos `.css` con el modo de lenguaje Tailwind
- ✅ Autocompletado en strings habilitado

## 🎨 Orden de Clases con Prettier

El plugin de Prettier ordena las clases automáticamente:

**Antes**:
```html
<button class="text-white px-4 sm:px-8 py-2 sm:py-3 bg-sky-700 hover:bg-sky-800">
  Submit
</button>
```

**Después**:
```html
<button class="bg-sky-700 px-4 py-2 text-white hover:bg-sky-800 sm:px-8 sm:py-3">
  Submit
</button>
```

## 📚 Referencias

- [Documentación oficial de Editor Setup](https://tailwindcss.com/docs/editor-setup)
- [Tailwind CSS IntelliSense en GitHub](https://github.com/tailwindlabs/tailwindcss-intellisense)
- [Prettier Plugin para Tailwind](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)

## 🚀 Próximos Pasos

1. Instalar las extensiones recomendadas en VS Code
2. Instalar el plugin de Prettier: `npm install -D prettier prettier-plugin-tailwindcss`
3. Configurar Prettier como formateador por defecto en VS Code


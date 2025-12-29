# Configuración de i18n (Internacionalización)

## ✅ Configuración Completada

El proyecto está configurado con **react-i18next** siguiendo la [documentación oficial de i18next](https://www.i18next.com/overview/getting-started).

## 🌍 Idiomas Soportados

- **Español (es)** - Idioma por defecto
- **Inglés (en)**
- **Portugués (pt)**

## 📁 Estructura

```
src/
├── i18n/
│   ├── config.ts          # Configuración de i18next
│   └── locales/
│       ├── es.json        # Traducciones en español
│       ├── en.json        # Traducciones en inglés
│       └── pt.json        # Traducciones en portugués
```

## 🔧 Configuración

### Características Implementadas

1. **Detección automática de idioma**: Detecta el idioma del navegador o localStorage
2. **Persistencia**: Guarda la preferencia en localStorage
3. **Fallback**: Si falta una traducción, usa español como fallback
4. **Sin Suspense**: Configurado para no usar Suspense (mejor compatibilidad)

## 📝 Uso en Componentes

### Hook useTranslation

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t, i18n } = useTranslation()
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>Idioma actual: {i18n.language}</p>
    </div>
  )
}
```

### Cambiar Idioma

```tsx
const { i18n } = useTranslation()

// Cambiar a inglés
i18n.changeLanguage('en')

// Cambiar a español
i18n.changeLanguage('es')

// Cambiar a portugués
i18n.changeLanguage('pt')
```

## 🎯 Claves de Traducción

### Estructura

- `common.*` - Textos comunes (welcome, loading, etc.)
- `auth.*` - Autenticación (login, register, etc.)
- `roles.*` - Roles de usuario
- `passenger.*` - Funcionalidades de pasajero
- `driver.*` - Funcionalidades de conductor
- `host.*` - Funcionalidades de host
- `navigation.*` - Navegación

## 📚 Referencias

- [Documentación oficial de i18next](https://www.i18next.com/overview/getting-started)
- [react-i18next](https://react.i18next.com/)
- [i18next-browser-languagedetector](https://github.com/i18next/i18next-browser-languagedetector)


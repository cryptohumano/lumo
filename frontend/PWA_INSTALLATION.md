# 📱 Guía de Instalación PWA

## ¿Qué es una PWA?
Una Progressive Web App (PWA) es una aplicación web que se puede instalar en tu dispositivo y funciona como una app nativa, incluso sin conexión a internet.

## 🚀 Cómo Instalar Operations como PWA

### En Android (Chrome/Edge):
1. Abre la aplicación en tu navegador móvil
2. Verás un banner o menú con la opción "Agregar a pantalla de inicio"
3. Toca "Agregar" o "Instalar"
4. La app se instalará en tu pantalla de inicio

### En iOS (Safari):
1. Abre la aplicación en Safari
2. Toca el botón de compartir (cuadrado con flecha)
3. Selecciona "Agregar a pantalla de inicio"
4. Personaliza el nombre si lo deseas
5. Toca "Agregar"

### En Desktop (Chrome/Edge):
1. Abre la aplicación en tu navegador
2. Busca el icono de instalación en la barra de direcciones (o menú)
3. Haz clic en "Instalar Operations"
4. Confirma la instalación

## ✨ Características de la PWA

- ✅ **Funciona sin conexión**: Carga páginas visitadas previamente
- ✅ **Notificaciones push**: Recibe notificaciones incluso fuera del navegador
- ✅ **Acceso rápido**: Icono en la pantalla de inicio
- ✅ **Experiencia nativa**: Se abre como una app independiente
- ✅ **Actualizaciones automáticas**: Se actualiza automáticamente

## 🔔 Notificaciones Push

Para recibir notificaciones cuando estés fuera del navegador:

1. Instala la PWA primero
2. Permite las notificaciones cuando el navegador lo solicite
3. Las notificaciones aparecerán incluso si la app está cerrada

## 🛠️ Desarrollo

### Crear Iconos PWA

Los iconos deben estar en `/public/`:
- `icon-192.png` (192x192 píxeles)
- `icon-512.png` (512x512 píxeles)

Puedes usar herramientas como:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Cualquier editor de imágenes

### Verificar Instalación

1. Abre DevTools (F12)
2. Ve a la pestaña "Application"
3. En "Service Workers" verifica que esté registrado
4. En "Manifest" verifica la configuración

## 📝 Notas

- La PWA requiere HTTPS en producción (o localhost en desarrollo)
- El Service Worker se registra automáticamente
- El botón de instalación aparece automáticamente cuando está disponible


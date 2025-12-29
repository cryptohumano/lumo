# Configuración del Nginx de Operations para Lumo

Para que ambos Nginx (operations y lumo) puedan coexistir, el Nginx de **operations** debe hacer proxy al Nginx de **lumo** cuando detecte el dominio `lumo.peranto.app`.

## Opción 1: Proxy desde el Nginx de Operations (Recomendado)

Agrega esta configuración al Nginx de operations (probablemente en `/ruta/a/operations/docker/nginx/conf.d/lumo.conf`):

```nginx
# Proxy para lumo.peranto.app -> Nginx de lumo
server {
    listen 80;
    listen [::]:80;
    server_name lumo.peranto.app www.lumo.peranto.app;

    # Para Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy a Nginx de lumo (usando el nombre del contenedor)
    location / {
        proxy_pass http://lumo-nginx:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# HTTPS (después de obtener certificados SSL)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name lumo.peranto.app www.lumo.peranto.app;

    ssl_certificate /etc/letsencrypt/live/lumo.peranto.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lumo.peranto.app/privkey.pem;

    # Proxy a Nginx de lumo
    location / {
        proxy_pass http://lumo-nginx:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Importante**: El Nginx de operations debe estar en la misma red Docker que el Nginx de lumo, o usar `network_mode: host` o una red compartida.

## Opción 2: Usar Puertos Alternativos (Si no puedes modificar el Nginx de operations)

Si no puedes modificar el Nginx de operations, puedes exponer el Nginx de lumo en puertos alternativos:

1. En `docker/docker-compose.yml`, descomenta y modifica los puertos:
```yaml
nginx:
  ports:
    - "8080:80"   # HTTP alternativo
    - "8443:443"  # HTTPS alternativo
```

2. Luego configura el Nginx de operations para hacer proxy a `localhost:8080` o `localhost:8443`.

## Verificación

Para verificar que ambos Nginx están corriendo sin conflictos:

```bash
# Ver contenedores Nginx
docker ps | grep nginx

# Verificar que no hay conflictos de puertos
sudo netstat -tulpn | grep -E ':(80|443)'

# Probar acceso al Nginx de lumo (desde dentro de la red Docker)
docker exec -it lumo-nginx wget -O- http://localhost
```

## Redes Docker

Si los Nginx están en redes diferentes, necesitas:

1. **Opción A**: Conectar el Nginx de operations a la red de lumo:
```yaml
# En docker-compose.yml de operations
nginx:
  networks:
    - operations-network
    - lumo-network  # Agregar esta red

networks:
  lumo-network:
    external: true
```

2. **Opción B**: Usar `network_mode: host` en ambos Nginx (menos recomendado).




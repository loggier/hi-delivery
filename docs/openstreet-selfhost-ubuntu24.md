# Self-Host de Mapas en Ubuntu 24.04 (Route + Geocode + Autocomplete)

Este documento te deja un stack propio para:

1. Rutas `route/v1/driving` (OSRM)
2. Reverse geocoding (coordenadas -> dirección) con Nominatim
3. Búsqueda/autocomplete básico (Nominatim search)

Objetivo: reemplazar dependencias externas y usar siempre infraestructura propia.

## 1) Requisitos recomendados

Para **México**:

- CPU: 8 vCPU mínimo (12 recomendado)
- RAM: 32 GB mínimo (64 GB recomendado para importaciones rápidas)
- Disco: 300 GB SSD mínimo
- SO: Ubuntu Server 24.04 LTS

Para **LatAm completo o Planet** necesitas mucho más disco/RAM.

## 2) Preparar servidor Ubuntu 24

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install ca-certificates curl gnupg lsb-release unzip jq
```

### Instalar Docker + Compose plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Reinicia sesión para tomar el grupo `docker`.

## 3) Estructura de proyecto en el servidor

```bash
mkdir -p ~/maps-stack/{osrm-data,nominatim-data,nominatim-db}
cd ~/maps-stack
```

## 4) Descargar dataset OSM (México)

```bash
cd ~/maps-stack/osrm-data
curl -L -o mexico-latest.osm.pbf https://download.geofabrik.de/north-america/mexico-latest.osm.pbf
```

## 5) Preprocesar OSRM (car profile)

```bash
cd ~/maps-stack
docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/mexico-latest.osm.pbf

docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend \
  osrm-partition /data/mexico-latest.osrm

docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend \
  osrm-customize /data/mexico-latest.osrm
```

## 6) Docker Compose (OSRM + Nominatim)

Crea `~/maps-stack/docker-compose.yml`:

```yaml
services:
  osrm:
    image: osrm/osrm-backend
    container_name: osrm-mx
    command: osrm-routed --algorithm mld /data/mexico-latest.osrm
    volumes:
      - ./osrm-data:/data:ro
    ports:
      - "5000:5000"
    restart: unless-stopped

  nominatim:
    image: mediagis/nominatim:latest
    container_name: nominatim-mx
    environment:
      PBF_PATH: /nominatim/data/mexico-latest.osm.pbf
      REPLICATION_URL: https://download.geofabrik.de/north-america/mexico-updates/
      NOMINATIM_PASSWORD: nominatim123
      IMPORT_WIKIPEDIA: "false"
      IMPORT_US_POSTCODES: "false"
      THREADS: "8"
    volumes:
      - ./nominatim-data:/nominatim/data
      - ./nominatim-db:/var/lib/postgresql/16/main
    ports:
      - "8080:8080"
    shm_size: 2g
    restart: unless-stopped
```

Copiar el PBF también para Nominatim:

```bash
cp ~/maps-stack/osrm-data/mexico-latest.osm.pbf ~/maps-stack/nominatim-data/
```

Levantar servicios:

```bash
cd ~/maps-stack
docker compose up -d
```

Nota: el primer import de Nominatim puede tardar bastante.

## 7) Endpoints de prueba

### 7.1 Route (OSRM)

```bash
curl "http://127.0.0.1:5000/route/v1/driving/-99.1332,19.4326;-99.1450,19.4150?overview=full&geometries=polyline&steps=false"
```

### 7.2 Reverse geocode (Nominatim)

```bash
curl "http://127.0.0.1:8080/reverse?lat=19.4326&lon=-99.1332&format=jsonv2&addressdetails=1"
```

### 7.3 Search/autocomplete básico (Nominatim)

```bash
curl "http://127.0.0.1:8080/search?q=av%20insurgentes%20cdmx&format=jsonv2&addressdetails=1&countrycodes=mx&limit=8"
```

## 8) Publicar por dominio (Nginx)

Ejemplo `/etc/nginx/sites-available/maps`:

```nginx
server {
  listen 80;
  server_name maps.tudominio.com;

  location /osrm/ {
    proxy_pass http://127.0.0.1:5000/;
    proxy_set_header Host $host;
  }

  location /nominatim/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
  }
}
```

Activar:

```bash
sudo ln -s /etc/nginx/sites-available/maps /etc/nginx/sites-enabled/maps
sudo nginx -t
sudo systemctl reload nginx
```

## 9) Cómo conectarlo con `hi-delivery`

En tu app ya usas:

1. Rutas OSRM para recorrido (`route/v1/driving`)
2. Geocode/autocomplete en mapa de direcciones

Recomendación:

1. Cambiar URLs hardcodeadas a variables `.env`:
   - `NEXT_PUBLIC_OSRM_URL=https://maps.tudominio.com/osrm/route/v1/driving`
   - `NEXT_PUBLIC_GEOCODE_URL=https://maps.tudominio.com/nominatim/reverse`
   - `NEXT_PUBLIC_AUTOCOMPLETE_URL=https://maps.tudominio.com/nominatim/search`
2. Mantener `countrycodes=mx` para resultados de México.
3. Mantener guardado de `route_path` en órdenes para no recalcular siempre.

## 10) Actualización de datos

### OSRM

Cada vez que actualices PBF:

```bash
cd ~/maps-stack/osrm-data
curl -L -o mexico-latest.osm.pbf https://download.geofabrik.de/north-america/mexico-latest.osm.pbf

cd ~/maps-stack
docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/mexico-latest.osm.pbf
docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend osrm-partition /data/mexico-latest.osrm
docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend osrm-customize /data/mexico-latest.osrm
docker compose restart osrm
```

### Nominatim

Puedes usar replicación de Geofabrik (configurada en `REPLICATION_URL`) o reimport periódico según tu operación.

## 11) Calidad y trade-offs

1. Google suele ganar en cobertura y normalización de direcciones.
2. Con OSM self-host ganas control, costo predecible y cero lock-in.
3. Para autocomplete “premium”, considera Pelias (más complejo) cuando escales.

## 12) Checklist rápido de producción

1. HTTPS (Let's Encrypt)
2. Firewall abierto solo a 80/443 (y puertos internos cerrados)
3. Monitoreo CPU/RAM/disco
4. Backups de `nominatim-db`
5. Alertas por uso de disco (OSM crece)


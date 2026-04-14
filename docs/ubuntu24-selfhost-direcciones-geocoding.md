# Ubuntu 24.04: Direcciones + Geocoding Self-Host (Sin Licencia de Pago)

Este documento instala solo lo necesario para:

1. Rutas `route/v1/driving` con **OSRM**
2. Geocoding + Reverse Geocoding + búsqueda de direcciones con **Nominatim**

Todo self-host y sin API comercial.

## 1) Requisitos recomendados (México)

- CPU: 8 vCPU mínimo
- RAM: 32 GB mínimo
- Disco: 300 GB SSD mínimo
- SO: Ubuntu Server 24.04 LTS

## 2) Instalar Docker en Ubuntu 24

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install ca-certificates curl gnupg lsb-release

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

Reinicia sesión para usar `docker` sin `sudo`.

## 3) Crear carpetas de trabajo

```bash
mkdir -p ~/maps-stack/{osrm-data,nominatim-data,nominatim-db}
cd ~/maps-stack
```

## 4) Descargar mapa de México (OSM)

```bash
cd ~/maps-stack/osrm-data
curl -L -o mexico-latest.osm.pbf https://download.geofabrik.de/north-america/mexico-latest.osm.pbf
cp mexico-latest.osm.pbf ~/maps-stack/nominatim-data/
```

## 5) Preparar datos de rutas (OSRM)

```bash
cd ~/maps-stack

docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/mexico-latest.osm.pbf

docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend \
  osrm-partition /data/mexico-latest.osrm

docker run --rm -t -v "$PWD/osrm-data:/data" osrm/osrm-backend \
  osrm-customize /data/mexico-latest.osrm
```

## 6) Crear `docker-compose.yml`

Archivo: `~/maps-stack/docker-compose.yml`

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

## 7) Levantar servicios

```bash
cd ~/maps-stack
docker compose up -d
```

Nota: el primer import de Nominatim tarda bastante.

## 8) Probar endpoints

### Rutas (OSRM)

```bash
curl "http://127.0.0.1:5000/route/v1/driving/-99.1332,19.4326;-99.1450,19.4150?overview=full&geometries=polyline&steps=false"
```

### Reverse geocoding (Nominatim)

```bash
curl "http://127.0.0.1:8080/reverse?lat=19.4326&lon=-99.1332&format=jsonv2&addressdetails=1"
```

### Búsqueda de direcciones / autocomplete básico

```bash
curl "http://127.0.0.1:8080/search?q=av%20insurgentes%20cdmx&format=jsonv2&addressdetails=1&countrycodes=mx&limit=8"
```

## 9) Endpoints que usarás en tu app

- Rutas: `http://TU_SERVIDOR:5000/route/v1/driving`
- Reverse geocoding: `http://TU_SERVIDOR:8080/reverse`
- Búsqueda direcciones: `http://TU_SERVIDOR:8080/search`

## 10) Importante (legal)

No hay licencia de pago, pero sí debes cumplir atribución de OpenStreetMap:

- Mostrar crédito: `© OpenStreetMap contributors`
- Cumplir ODbL cuando aplique a datos derivados.


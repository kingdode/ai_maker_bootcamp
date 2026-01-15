# DealStackr Docker Deployment Guide

## Quick Start

### Production Build & Run

```bash
# Build and start the production container
docker-compose up -d --build

# View logs
docker-compose logs -f dealstackr-web

# Stop the container
docker-compose down
```

### Development Mode

```bash
# Start with hot reloading
docker-compose -f docker-compose.dev.yml up --build

# The app will be available at http://localhost:3000
# Changes to src/ will trigger automatic reload
```

## File Structure

```
ai_maker_bootcamp/
├── docker-compose.yml          # Production compose file
├── docker-compose.dev.yml      # Development compose file
├── dealstackr-web/
│   ├── Dockerfile              # Production Dockerfile (multi-stage)
│   ├── Dockerfile.dev          # Development Dockerfile
│   └── .dockerignore           # Files to exclude from build
└── offers-chrome-extension/    # Chrome extension (not dockerized)
```

## Useful Commands

```bash
# Build without cache
docker-compose build --no-cache

# Enter container shell
docker exec -it dealstackr-web sh

# View container stats
docker stats dealstackr-web

# Remove all data and rebuild
docker-compose down -v
docker-compose up -d --build

# Check health status
docker inspect --format='{{.State.Health.Status}}' dealstackr-web
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | Port to run on |

## Volumes

| Volume | Purpose |
|--------|---------|
| `dealstackr-data` | Persistent storage for synced offers and featured deals |

## Ports

| Port | Service |
|------|---------|
| 3000 | Next.js web application |

## Chrome Extension Sync

After starting the Docker container:

1. Install the DealStackr Chrome extension
2. Scan your Chase/Amex offers
3. Open the extension dashboard
4. Click "🌐 Sync to Website"
5. The offers will sync to `http://localhost:3000`

## Production Deployment Tips

### Using with Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name dealstackr.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Using with Traefik (labels already configured)

The docker-compose.yml includes Traefik labels. To use:

```bash
# Add to your Traefik network
docker network connect traefik_network dealstackr-web
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs dealstackr-web

# Check if port is in use
lsof -i :3000
```

### Data not persisting
```bash
# Check volume
docker volume inspect ai_maker_bootcamp_dealstackr-data

# Verify mount
docker exec -it dealstackr-web ls -la .data/
```

### Hot reload not working (dev mode)
```bash
# On Mac/Windows, enable polling
WATCHPACK_POLLING=true docker-compose -f docker-compose.dev.yml up
```

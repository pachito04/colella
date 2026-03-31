#!/bin/bash
set -e

REPO_DIR="/opt/colella"
COMPOSE_FILE="/srv/stacks/colellaprod/docker-compose.yml"
ENV_FILE="/srv/stacks/colellaprod/.env"

echo "[deploy] $(date) - Iniciando deploy..."

cd "$REPO_DIR"
git pull origin main

echo "[deploy] Pull OK. Leyendo variables..."
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "[deploy] Construyendo imagen Docker..."
docker build \
  --build-arg MERCADO_PAGO_ACCESS_TOKEN="$MERCADO_PAGO_ACCESS_TOKEN" \
  --build-arg RESEND_API_KEY="$RESEND_API_KEY" \
  --build-arg DATABASE_URL="$DATABASE_URL" \
  -t spini03/kine-web:latest "$REPO_DIR"

echo "[deploy] Reiniciando contenedor web..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate web

echo "[deploy] $(date) - Deploy completado."

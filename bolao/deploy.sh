#!/bin/bash
# Deploy do Bolão da Copa 2026 no VPS
# Executar no VPS após: git pull
# Uso: bash /app/bolao/deploy.sh

set -e

echo "=== Deploy Bolão da Copa 2026 ==="

# Copia app.py para dentro do container
docker cp /app/bolao/app.py bolao-copa-1:/app/app.py
echo "✓ app.py atualizado no container"

# Copia arquivos estáticos para o volume do nginx
cp /app/bolao/static/bolao/admin.js   /var/lib/docker/volumes/app_django_static/_data/bolao/admin.js
cp /app/bolao/static/bolao/app.js     /var/lib/docker/volumes/app_django_static/_data/bolao/app.js
cp /app/bolao/static/bolao/styles.css /var/lib/docker/volumes/app_django_static/_data/bolao/styles.css
cp /app/bolao/static/bolao/sw.js      /var/lib/docker/volumes/app_django_static/_data/bolao/sw.js
echo "✓ Arquivos estáticos atualizados"

# Reinicia o container
docker restart bolao-copa-1
echo "✓ Container reiniciado"

sleep 2
STATUS=$(docker ps --filter name=bolao-copa-1 --format '{{.Status}}')
echo "Status: $STATUS"
echo "=== Deploy concluído ==="

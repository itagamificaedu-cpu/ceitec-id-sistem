# ═══════════════════════════════════════════════════════════════
# ITA TECNOLOGIA EDUCACIONAL — Makefile
# ═══════════════════════════════════════════════════════════════

.PHONY: dev build deploy migrate seed reset logs help

help:
	@echo ""
	@echo "  ITA TECNOLOGIA EDUCACIONAL"
	@echo "  ═════════════════════════"
	@echo "  make dev       — Inicia tudo em modo desenvolvimento"
	@echo "  make build     — Build completo para produção"
	@echo "  make deploy    — Sobe com docker-compose (produção)"
	@echo "  make migrate   — Roda migrations do Django"
	@echo "  make seed      — Cria superusuário e tenant inicial"
	@echo "  make reset     — Para tudo e limpa volumes"
	@echo "  make logs      — Mostra logs de todos os serviços"
	@echo ""

# ── Desenvolvimento local (sem Docker) ────────────────────────
dev:
	@echo "Iniciando Django (porta 8000) e Node.js (porta 3001) e React (porta 5173)..."
	@cd plataforma && python manage.py runserver 8000 &
	@cd backend && npm run dev &
	@cd frontend && npm run dev

# ── Build para produção ────────────────────────────────────────
build:
	docker-compose build

# ── Deploy com Docker ──────────────────────────────────────────
deploy:
	cp .env.example .env 2>/dev/null || true
	docker-compose up -d
	@echo ""
	@echo "✅ ITA TECNOLOGIA EDUCACIONAL rodando!"
	@echo "   Portal React:   http://localhost"
	@echo "   Django Admin:   http://localhost/admin"
	@echo "   API Django:     http://localhost/api"
	@echo "   API Node:       http://localhost/node-api"
	@echo ""

# ── Migrations Django ──────────────────────────────────────────
migrate:
	cd plataforma && python manage.py makemigrations && python manage.py migrate

# ── Seed inicial ───────────────────────────────────────────────
seed:
	cd plataforma && python manage.py shell -c "\
from gamificaedu.core.models import Tenant; \
t, _ = Tenant.objects.get_or_create(nome='ITA Tecnologia', dominio='localhost'); \
print('Tenant criado:', t)"
	cd plataforma && python manage.py createsuperuser

# ── Parar tudo ─────────────────────────────────────────────────
stop:
	docker-compose stop

# ── Reset completo ─────────────────────────────────────────────
reset:
	docker-compose down -v
	@echo "⚠️  Todos os dados foram apagados."

# ── Logs ───────────────────────────────────────────────────────
logs:
	docker-compose logs -f

# ── Migração de dados do GamificaEdu ──────────────────────────
migrate-data:
	cd plataforma && python ../migrate_data.py

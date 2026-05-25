#!/usr/bin/env python
"""
migrate_data.py — ITA TECNOLOGIA EDUCACIONAL
Migra dados do SQLite do GamificaEdu para o banco do sistema unificado.

Uso:
    cd plataforma
    python ../migrate_data.py

    # Ou via Makefile:
    make migrate-data
"""

import os
import sys
import sqlite3
import django

# Configura o Django antes de qualquer import de model
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ita_tecnologia.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/plataforma')
django.setup()

from gamificaedu.accounts.models import Professor
from gamificaedu.core.models import Tenant, Assinatura
from gamificaedu.gamification.models import GamificacaoPerfil

# ── Caminho do banco SQLite original ──────────────────────────────
SQLITE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', 'GameficaEdu', 'portal_professores', 'db.sqlite3'
)

def conectar_sqlite():
    if not os.path.exists(SQLITE_PATH):
        print(f"❌ Banco SQLite não encontrado em: {SQLITE_PATH}")
        print("   Ajuste o SQLITE_PATH no início do script.")
        sys.exit(1)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def migrar_tenants(conn, stats):
    print("\n📦 Migrando Tenants (Escolas)...")
    cur = conn.execute("SELECT * FROM core_tenant")
    tenants_map = {}
    for row in cur.fetchall():
        tenant, criado = Tenant.objects.get_or_create(
            nome=row['nome'],
            defaults={'dominio': row['dominio'] or f"escola-{row['id']}.ita.edu.br"}
        )
        tenants_map[row['id']] = tenant
        status = '✅ criado' if criado else '↩️  existia'
        print(f"   {status}: {tenant.nome}")
    stats['tenants'] = len(tenants_map)
    return tenants_map

def migrar_professores(conn, tenants_map, stats):
    print("\n👨‍🏫 Migrando Professores...")
    cur = conn.execute("""
        SELECT p.*, t.nome as tenant_nome
        FROM accounts_professor p
        LEFT JOIN core_tenant t ON p.tenant_id = t.id
    """)
    rows = cur.fetchall()
    migrados = 0
    ignorados = 0

    for row in rows:
        tenant = tenants_map.get(row['tenant_id'])
        if not tenant:
            print(f"   ⚠️  Professor {row['email']} sem tenant — ignorado")
            ignorados += 1
            continue

        if Professor.objects.filter(email=row['email']).exists():
            print(f"   ↩️  Já existe: {row['email']}")
            ignorados += 1
            continue

        try:
            prof = Professor(
                username=row['username'] or row['email'].split('@')[0],
                email=row['email'],
                first_name=row['first_name'] or '',
                last_name=row['last_name'] or '',
                escola=row['escola'] or '',
                disciplina=row['disciplina'] or '',
                telefone=row['telefone'] or '',
                cidade=row['cidade'] or '',
                estado=row['estado'] or '',
                plano=row['plano'] or 'gratuito',
                type_user=row['type_user'] or 'prof',
                status_aprovacao=row['status_aprovacao'] or 'aprovado',
                email_confirmado=bool(row['email_confirmado']),
                is_active=bool(row['is_active']),
                is_staff=bool(row['is_staff']),
                is_superuser=bool(row['is_superuser']),
                tenant=tenant,
            )
            # Preserva o hash da senha (compatível entre versões Django)
            prof.password = row['password']
            prof.save()
            migrados += 1
            print(f"   ✅ Migrado: {prof.email} (plano: {prof.plano})")
        except Exception as e:
            print(f"   ❌ Erro ao migrar {row['email']}: {e}")
            ignorados += 1

    stats['professores_migrados'] = migrados
    stats['professores_ignorados'] = ignorados

def migrar_assinaturas(conn, stats):
    print("\n💳 Migrando Assinaturas...")
    cur = conn.execute("SELECT * FROM core_assinatura")
    migradas = 0
    for row in cur.fetchall():
        try:
            prof = Professor.objects.get(email__icontains=str(row['usuario_id']))
        except Professor.DoesNotExist:
            # tenta por id
            try:
                prof = Professor.objects.get(pk=row['usuario_id'])
            except Professor.DoesNotExist:
                continue

        Assinatura.objects.update_or_create(
            usuario=prof,
            defaults={'plano': row['plano'], 'ativo': bool(row['ativo']), 'tenant': prof.tenant}
        )
        migradas += 1
    stats['assinaturas'] = migradas

def migrar_gamification(stats):
    print("\n🎮 Criando perfis gamificados para professores sem perfil...")
    sem_perfil = 0
    for prof in Professor.objects.all():
        perfil, criado = GamificacaoPerfil.objects.get_or_create(
            usuario=prof,
            defaults={'tenant': prof.tenant}
        )
        if criado:
            sem_perfil += 1
    stats['perfis_gamificacao'] = sem_perfil

def imprimir_relatorio(stats):
    print("\n" + "═" * 50)
    print("  RELATÓRIO DE MIGRAÇÃO — ITA TECNOLOGIA")
    print("═" * 50)
    print(f"  Tenants (escolas) migrados : {stats.get('tenants', 0)}")
    print(f"  Professores migrados       : {stats.get('professores_migrados', 0)}")
    print(f"  Professores já existiam    : {stats.get('professores_ignorados', 0)}")
    print(f"  Assinaturas migradas       : {stats.get('assinaturas', 0)}")
    print(f"  Perfis gamificação criados : {stats.get('perfis_gamificacao', 0)}")
    print("═" * 50)
    print("  ✅ Migração concluída!")
    print()

if __name__ == '__main__':
    stats = {}
    conn = conectar_sqlite()

    try:
        tenants_map = migrar_tenants(conn, stats)
        migrar_professores(conn, tenants_map, stats)
        migrar_assinaturas(conn, stats)
        migrar_gamification(stats)
    finally:
        conn.close()

    imprimir_relatorio(stats)

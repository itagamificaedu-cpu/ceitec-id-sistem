#!/usr/bin/env python
"""
Script de migração — GamificaEdu → ITA Tecnologia Central
Cria PlanoEscola para todos os Tenants existentes e gera dados demo se necessário.

Uso:
    cd plataforma
    python migrate_gamificaedu.py
"""
import os
import sys
import django
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ita_tecnologia.settings')
django.setup()

from django.utils import timezone
from gamificaedu.core.models import Tenant, Assinatura
from gamificaedu.accounts.models import Professor
from ita_core.models import PlanoEscola

LOG_LINES = []


def log(msg):
    print(msg)
    LOG_LINES.append(msg)


def migrar_tenants():
    log('=' * 60)
    log('  ITA TECNOLOGIA — SCRIPT DE MIGRAÇÃO')
    log('=' * 60)

    tenants = Tenant.objects.all()
    log(f'\n📊 Tenants encontrados: {tenants.count()}')

    migradas = 0
    ja_existia = 0
    erros = 0

    for tenant in tenants:
        try:
            # Verifica se já tem PlanoEscola
            try:
                pe = tenant.plano_escola
                log(f'  ✅ (já existe) {tenant.nome} — {pe.plano}/{pe.status}')
                ja_existia += 1
                continue
            except PlanoEscola.DoesNotExist:
                pass

            # Tenta mapear a assinatura existente do GamificaEdu
            plano_str = 'trial'
            status_str = 'trial'
            valor = 0

            # Pega o primeiro Professor do tenant para checar assinatura
            prof = Professor.objects.filter(tenant=tenant).first()
            if prof:
                try:
                    assinatura = prof.assinatura
                    if assinatura.plano == 'colaborador':
                        plano_str = 'escola'
                        status_str = 'ativo'
                        valor = 99
                    elif assinatura.plano == 'educador':
                        plano_str = 'professor'
                        status_str = 'ativo'
                        valor = 29
                    else:
                        plano_str = 'trial'
                        status_str = 'trial'
                        valor = 0
                except Exception:
                    pass

            vencimento = date.today() + timedelta(days=30 if status_str == 'ativo' else 7)

            PlanoEscola.objects.create(
                tenant=tenant,
                plano=plano_str,
                inicio=date.today(),
                vencimento=vencimento,
                valor_mensal=valor,
                status=status_str,
            )
            log(f'  🆕 Migrada: {tenant.nome} → plano={plano_str}, status={status_str}')
            migradas += 1

        except Exception as e:
            log(f'  ❌ Erro em {tenant.nome}: {e}')
            erros += 1

    return migradas, ja_existia, erros


def criar_dados_demo():
    log('\n🎭 Criando dados de demonstração...')

    demos = [
        {'nome': 'EEMTI Dom Pedro II', 'email': 'dompedro@demo.local', 'plano': 'escola', 'valor': 99},
        {'nome': 'Escola Prof. João Silva', 'email': 'joaosilva@demo.local', 'plano': 'professor', 'valor': 29},
        {'nome': 'Colégio Modelo Itapipoca', 'email': 'modelo@demo.local', 'plano': 'trial', 'valor': 0},
    ]

    for d in demos:
        if Professor.objects.filter(email=d['email']).exists():
            log(f'  ⏭️  Demo já existe: {d["nome"]}')
            continue

        tenant = Tenant.objects.create(
            nome=d['nome'],
            dominio=d['email'].split('@')[0] + '.demo.local',
        )

        professor = Professor.objects.create_user(
            username=d['email'],
            email=d['email'],
            password='Demo@2025!',
            first_name=d['nome'],
            type_user='school',
            tenant=tenant,
            escola=d['nome'],
            email_confirmado=True,
            status_aprovacao='aprovado',
            is_active=True,
        )

        dias = 30 if d['plano'] != 'trial' else 7
        PlanoEscola.objects.create(
            tenant=tenant,
            plano=d['plano'],
            inicio=date.today(),
            vencimento=date.today() + timedelta(days=dias),
            valor_mensal=d['valor'],
            status=d['plano'] if d['plano'] == 'trial' else 'ativo',
        )
        log(f'  ✅ Demo criada: {d["nome"]} | email: {d["email"]} | senha: Demo@2025!')


def salvar_log(migradas, ja_existia, erros):
    linhas = [
        '=' * 60,
        'RELATÓRIO DE MIGRAÇÃO — ITA TECNOLOGIA EDUCACIONAL',
        f'Data: {timezone.now().strftime("%d/%m/%Y %H:%M")}',
        '=' * 60,
        f'Tenants migrados:    {migradas}',
        f'Já existiam:         {ja_existia}',
        f'Erros:               {erros}',
        '',
        'LOG COMPLETO:',
        *LOG_LINES,
    ]
    with open('MIGRACAO_LOG.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(linhas))
    print('\n📄 Log salvo em MIGRACAO_LOG.txt')


if __name__ == '__main__':
    migradas, ja_existia, erros = migrar_tenants()

    # Se não há dados, cria demos
    if Tenant.objects.count() == 0:
        criar_dados_demo()
    elif migradas == 0 and ja_existia == 0:
        log('\n⚠️  Nenhum tenant existente. Criando dados de demonstração...')
        criar_dados_demo()

    log('\n' + '=' * 60)
    log(f'✅ Migração concluída: {migradas} migradas | {ja_existia} já existiam | {erros} erros')
    log('=' * 60)
    log('\n🔑 ACESSO MASTER:')
    log(f'   URL:   http://localhost:8000/master/')
    log(f'   Senha: (definida em .env → MASTER_PASSWORD)')
    log('\n🏫 PORTAL ESCOLAS:')
    log(f'   URL:   http://localhost:8000/login/')
    log('=' * 60)

    salvar_log(migradas, ja_existia, erros)

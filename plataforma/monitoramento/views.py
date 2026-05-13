import csv
import json
from functools import wraps

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_POST

from .models import MonitoramentoFoco


# ══════════════════════════════════════════════════════════════════
# DECORADOR — acesso restrito a professor (is_staff) ou grupo 'professor'
# ══════════════════════════════════════════════════════════════════

def apenas_professor(view_func):
    """
    Permite acesso apenas a usuários com is_staff=True
    ou pertencentes ao grupo 'professor'.
    Redireciona para login se não autenticado.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('/accounts/login/')
        eh_staff = request.user.is_staff
        eh_grupo = request.user.groups.filter(name='professor').exists()
        if eh_staff or eh_grupo:
            return view_func(request, *args, **kwargs)
        # Usuário logado mas sem permissão — volta ao dashboard
        return redirect('/dashboard/')
    return wrapper


# ══════════════════════════════════════════════════════════════════
# ENDPOINT DA API — POST /api/monitoramento/registrar/
# ══════════════════════════════════════════════════════════════════

@login_required
@require_POST
def registrar_evento(request):
    """
    Recebe e salva um evento de foco/desfoco enviado pelo JavaScript do aluno.

    Payload esperado (JSON):
        sessao_id        — UUID gerado no navegador
        prova_id         — ID da prova (int ou UUID, como string)
        tipo_evento      — 'blur' | 'visibility_hidden' | 'foco_retornado'
        timestamp_cliente — ISO 8601 string do relógio do navegador

    Retorna:
        { "status": "ok", "total_saidas": N }
    """
    try:
        dados = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse(
            {'status': 'erro', 'mensagem': 'JSON inválido'},
            status=400,
        )

    sessao_id  = str(dados.get('sessao_id',  '')).strip()
    prova_id   = str(dados.get('prova_id',   '')).strip()
    tipo_evento = str(dados.get('tipo_evento', '')).strip()
    ts_cliente  = dados.get('timestamp_cliente', '')

    # ── Validação ──────────────────────────────────────────────────
    tipos_validos = {'blur', 'visibility_hidden', 'foco_retornado'}
    if not sessao_id or not prova_id or tipo_evento not in tipos_validos:
        return JsonResponse(
            {'status': 'erro', 'mensagem': 'Dados obrigatórios ausentes ou tipo_evento inválido'},
            status=400,
        )

    # ── Timestamp do cliente (opcional) ───────────────────────────
    timestamp_cliente = None
    if ts_cliente:
        try:
            timestamp_cliente = parse_datetime(ts_cliente)
        except Exception:
            pass  # timestamp inválido é ignorado silenciosamente

    # ── Conta saídas anteriores nessa sessão (apenas eventos de saída) ──
    saidas_anteriores = MonitoramentoFoco.objects.filter(
        aluno=request.user,
        sessao_id=sessao_id,
        tipo_evento__in=['blur', 'visibility_hidden'],
    ).count()

    # Se o evento atual também é uma saída, acrescenta 1
    total_saidas = saidas_anteriores + (1 if tipo_evento in ['blur', 'visibility_hidden'] else 0)

    # ── Persiste o registro ────────────────────────────────────────
    MonitoramentoFoco.objects.create(
        aluno=request.user,
        sessao_id=sessao_id,
        prova_id=prova_id,
        tipo_evento=tipo_evento,
        timestamp_cliente=timestamp_cliente,
        total_saidas=total_saidas,
    )

    return JsonResponse({'status': 'ok', 'total_saidas': total_saidas})


# ══════════════════════════════════════════════════════════════════
# VIEW DO RELATÓRIO — GET /professor/monitoramento/<prova_id>/
# ══════════════════════════════════════════════════════════════════

@apenas_professor
def relatorio_professor(request, prova_id):
    """
    Exibe relatório de monitoramento de foco de uma prova.
    Acessível apenas para professores (is_staff ou grupo 'professor').

    Parâmetro de query:
        ?exportar=csv  — baixa o relatório como planilha .csv
    """
    # Busca todos os registros desta prova, mais recentes primeiro
    registros = (
        MonitoramentoFoco.objects
        .filter(prova_id=str(prova_id))
        .select_related('aluno')
        .order_by('aluno__email', 'timestamp')
    )

    # ── Agrupa por aluno ───────────────────────────────────────────
    alunos_map = {}
    for reg in registros:
        chave = reg.aluno.pk
        if chave not in alunos_map:
            alunos_map[chave] = {
                'aluno':        reg.aluno,
                'total_saidas': 0,
                'saidas':       [],   # timestamps das saídas (não dos retornos)
            }
        if reg.tipo_evento in ['blur', 'visibility_hidden']:
            alunos_map[chave]['total_saidas'] += 1
            alunos_map[chave]['saidas'].append(reg.timestamp)

    # ── Classifica cada aluno com badge visual ─────────────────────
    for dados in alunos_map.values():
        total = dados['total_saidas']
        if total <= 1:
            dados['badge']       = 'NORMAL'
            dados['badge_class'] = 'success'
        elif total <= 3:
            dados['badge']       = 'ATENÇÃO'
            dados['badge_class'] = 'warning'
        else:
            dados['badge']       = 'SUSPEITO'
            dados['badge_class'] = 'danger'

    # Ordena: mais suspeitos primeiro
    alunos_lista = sorted(
        alunos_map.values(),
        key=lambda x: x['total_saidas'],
        reverse=True,
    )

    # ── Exportação CSV ─────────────────────────────────────────────
    if request.GET.get('exportar') == 'csv':
        resposta = HttpResponse(content_type='text/csv; charset=utf-8')
        resposta['Content-Disposition'] = (
            f'attachment; filename="monitoramento_prova_{prova_id}.csv"'
        )
        # BOM para o Excel reconhecer UTF-8 corretamente
        resposta.write('﻿')

        writer = csv.writer(resposta, delimiter=';')
        writer.writerow([
            'Aluno', 'Email', 'Total de Saídas', 'Classificação', 'Horários das Saídas',
        ])
        for dados in alunos_lista:
            horarios = ' | '.join(
                s.strftime('%d/%m/%Y %H:%M:%S') for s in dados['saidas']
            )
            nome = dados['aluno'].get_full_name() or dados['aluno'].email
            writer.writerow([
                nome,
                dados['aluno'].email,
                dados['total_saidas'],
                dados['badge'],
                horarios,
            ])
        return resposta

    # ── Renderiza o template do relatório ─────────────────────────
    contexto = {
        'prova_id':        prova_id,
        'alunos_lista':    alunos_lista,
        'total_alunos':    len(alunos_lista),
    }
    return render(request, 'monitoramento/relatorio.html', contexto)

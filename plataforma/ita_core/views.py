import os
import hashlib
from datetime import timedelta

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse
from django.conf import settings

from gamificaedu.accounts.models import Professor
from gamificaedu.core.models import Tenant
from .models import SessaoSSO, LogAcesso, PlanoEscola
from . import sso


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def _get_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')


def _log(request, modulo, acao, detalhes=None):
    usuario = request.user if request.user.is_authenticated else None
    LogAcesso.objects.create(
        usuario=usuario,
        modulo=modulo,
        acao=acao,
        ip=_get_ip(request),
        detalhes=detalhes or {},
    )


def _verificar_master(request):
    """Retorna True se a sessão master está ativa."""
    return request.session.get('master_autenticado') is True


def _master_required(view_func):
    """Decorator: redireciona para /master/ se não for admin master."""
    from functools import wraps
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not _verificar_master(request):
            return redirect('/master/')
        return view_func(request, *args, **kwargs)
    return wrapper


def _get_plano_escola(usuario):
    """Retorna o PlanoEscola do tenant do usuário, ou None."""
    try:
        return usuario.tenant.plano_escola
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
# PORTAL — LOGIN / LOGOUT / HOME
# ─────────────────────────────────────────────────────────────

@csrf_protect
@require_http_methods(['GET', 'POST'])
def portal_login(request):
    """Login unificado para escolas."""
    if request.method == 'GET':
        # Se já tem SSO válido, vai direto para o portal
        token = sso.obter_token_do_request(request)
        if token and sso.decodificar_token_sso(token):
            return redirect('/portal/')
        return render(request, 'ita_core/login.html', {
            'next': request.GET.get('next', '/portal/'),
            'msg': request.GET.get('msg', ''),
        })

    email = request.POST.get('email', '').strip().lower()
    senha = request.POST.get('senha', '')
    next_url = request.POST.get('next', '/portal/')

    # Autenticação Django
    usuario = authenticate(request, username=email, password=senha)
    if not usuario:
        _log(request, 'portal', 'login_falhou', {'email': email})
        return render(request, 'ita_core/login.html', {
            'erro': 'Email ou senha inválidos.',
            'next': next_url,
        })

    if not usuario.is_active:
        return render(request, 'ita_core/login.html', {
            'erro': 'Conta inativa. Verifique seu e-mail ou contate o suporte.',
            'next': next_url,
        })

    # Obtém plano
    plano_obj = _get_plano_escola(usuario)
    plano_info = {
        'plano': plano_obj.plano if plano_obj else 'trial',
        'modulos': plano_obj.modulos_liberados if plano_obj else ['itagame', 'corretor', 'repositorio', 'quiz', 'pedagogico', 'configuracoes'],
        'dias_restantes': plano_obj.dias_restantes if plano_obj else 0,
        'status': plano_obj.status if plano_obj else 'trial',
    }

    # Gera token SSO
    token_jwt = sso.gerar_token_sso(usuario, plano_info)

    # Invalida sessões SSO antigas deste usuário
    SessaoSSO.objects.filter(usuario=usuario, ativa=True).update(ativa=False)

    # Cria nova sessão SSO
    expira_em = timezone.now() + timedelta(hours=int(getattr(settings, 'SSO_TOKEN_EXPIRATION_HOURS', 8)))
    SessaoSSO.objects.create(
        usuario=usuario,
        token=token_jwt,
        expira_em=expira_em,
        ip_origem=_get_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
    )

    _log(request, 'portal', 'login_ok', {'plano': plano_info['plano']})

    # Faz login Django e define cookie SSO
    auth_login(request, usuario)
    response = redirect(next_url if next_url.startswith('/') else '/portal/')
    response.set_cookie(
        'sso_token',
        token_jwt,
        max_age=int(getattr(settings, 'SSO_TOKEN_EXPIRATION_HOURS', 8)) * 3600,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
    )
    return response


def portal_logout(request):
    token = sso.obter_token_do_request(request)
    if token:
        SessaoSSO.objects.filter(token=token).update(ativa=False)
    _log(request, 'portal', 'logout')
    auth_logout(request)
    resp = redirect('/login/')
    resp.delete_cookie('sso_token')
    return resp


def portal_home(request):
    """Hub central — exige SSO válido (garantido pelo middleware)."""
    payload = getattr(request, 'sso_payload', None)

    # Se vier sem SSO (acesso direto sem middleware), redireciona
    if not payload and not request.user.is_authenticated:
        return redirect('/login/')

    usuario = request.user if request.user.is_authenticated else None
    plano_obj = _get_plano_escola(usuario) if usuario else None

    modulos_liberados = payload.get('modulos', []) if payload else (
        plano_obj.modulos_liberados if plano_obj else []
    )

    MODULOS = [
        {
            'id': 'itagame',
            'icon': '🎮',
            'nome': 'ItagGame',
            'descricao': 'Gamificação educacional com XP, missões, badges e ranking de turmas.',
            'url': '/itagame/',
            'planos': ['trial', 'professor', 'escola'],
            'cor': '#6c63ff',
        },
        {
            'id': 'corretor',
            'icon': '📝',
            'nome': 'Corretor de Provas',
            'descricao': 'Correção automática com IA via QR Code ou resposta online.',
            'url': '/corretor/',
            'planos': ['trial', 'professor', 'escola'],
            'cor': '#f5a623',
        },
        {
            'id': 'repositorio',
            'icon': '📁',
            'nome': 'Repositório',
            'descricao': 'Biblioteca de materiais didáticos, atividades e recursos da escola.',
            'url': '/ferramentas/',
            'planos': ['trial', 'professor', 'escola'],
            'cor': '#00d68f',
        },
        {
            'id': 'relatorios',
            'icon': '📊',
            'nome': 'Relatórios',
            'descricao': 'Desempenho e progresso dos alunos com gráficos detalhados.',
            'url': '/relatorios/',
            'planos': ['escola'],
            'cor': '#4a90d9',
            'upgrade_plano': 'escola',
        },
        {
            'id': 'gestao_professores',
            'icon': '👥',
            'nome': 'Gestão de Professores',
            'descricao': 'Adicione, gerencie e monitore todos os professores da escola.',
            'url': '/gestao-professores/',
            'planos': ['escola'],
            'cor': '#ef5350',
            'upgrade_plano': 'escola',
        },
        {
            'id': 'pedagogico',
            'icon': '📚',
            'nome': 'Área Pedagógica',
            'descricao': 'Resultados por aluno, diagnóstico por disciplina e relatórios completos de avaliações.',
            'url': '/pedagogico/',
            'planos': ['trial', 'professor', 'escola'],
            'cor': '#1e88e5',
        },
        {
            'id': 'quiz',
            'icon': '🎯',
            'nome': 'Quiz',
            'descricao': 'Crie quizzes com cronômetro estilo Kahoot. Veja quem acertou e errou cada pergunta.',
            'url': '/quiz/',
            'planos': ['trial', 'professor', 'escola'],
            'cor': '#e91e8c',
        },
        {
            'id': 'configuracoes',
            'icon': '⚙️',
            'nome': 'Configurações',
            'descricao': 'Dados da escola, logo, turmas e preferências do sistema.',
            'url': '/accounts/perfil/',
            'planos': ['trial', 'professor', 'escola'],
            'cor': '#78909c',
        },
    ]

    plano_atual = payload.get('plano', 'trial') if payload else (
        plano_obj.plano if plano_obj else 'trial'
    )

    for mod in MODULOS:
        mod['liberado'] = mod['id'] in modulos_liberados

    dias_restantes = payload.get('dias_restantes', 0) if payload else (
        plano_obj.dias_restantes if plano_obj else 0
    )

    _log(request, 'portal', 'acessou_hub')

    return render(request, 'ita_core/portal.html', {
        'modulos': MODULOS,
        'plano_atual': plano_atual,
        'dias_restantes': dias_restantes,
        'usuario': usuario,
        'plano_obj': plano_obj,
        'payload': payload,
    })


# ─────────────────────────────────────────────────────────────
# MASTER — LOGIN / DASHBOARD / GERENCIAMENTO
# ─────────────────────────────────────────────────────────────

@csrf_protect
@require_http_methods(['GET', 'POST'])
def master_login(request):
    if _verificar_master(request):
        return redirect('/master/dashboard/')

    if request.method == 'GET':
        return render(request, 'ita_core/master_login.html')

    senha = request.POST.get('senha', '')
    master_senha = getattr(settings, 'MASTER_PASSWORD', '') or os.environ.get('MASTER_PASSWORD', '')

    if not master_senha:
        return render(request, 'ita_core/master_login.html', {
            'erro': 'MASTER_PASSWORD não configurada no servidor. Defina no arquivo .env.'
        })

    if senha == master_senha:
        request.session['master_autenticado'] = True
        request.session['master_login_em'] = timezone.now().isoformat()
        request.session.set_expiry(43200)  # 12 horas
        _log(request, 'master', 'login_ok')
        return redirect('/master/dashboard/')

    _log(request, 'master', 'login_falhou')
    return render(request, 'ita_core/master_login.html', {
        'erro': 'Senha incorreta. Tente novamente.'
    })


def master_logout(request):
    _log(request, 'master', 'logout')
    request.session.flush()
    return redirect('/master/')


@_master_required
def master_dashboard(request):
    tenants = Tenant.objects.all().prefetch_related('plano_escola')
    professores = Professor.objects.all()

    total_escolas = tenants.count()
    escolas_com_plano = []
    inadimplentes = 0
    mrr = 0

    for t in tenants:
        try:
            p = t.plano_escola
            escolas_com_plano.append({
                'tenant': t,
                'plano': p,
                'ativo': p.ativo,
                'dias': p.dias_restantes,
            })
            if p.status == 'inadimplente':
                inadimplentes += 1
            if p.status == 'ativo':
                mrr += float(p.valor_mensal)
        except PlanoEscola.DoesNotExist:
            escolas_com_plano.append({'tenant': t, 'plano': None, 'ativo': False, 'dias': 0})

    sessoes_ativas = SessaoSSO.objects.filter(ativa=True, expira_em__gt=timezone.now()).count()
    logs_recentes = LogAcesso.objects.select_related('usuario').order_by('-momento')[:20]

    novos_este_mes = Professor.objects.filter(
        criado_em__year=timezone.now().year,
        criado_em__month=timezone.now().month,
    ).count()

    return render(request, 'ita_core/master_dashboard.html', {
        'total_escolas': total_escolas,
        'inadimplentes': inadimplentes,
        'mrr': mrr,
        'sessoes_ativas': sessoes_ativas,
        'novos_este_mes': novos_este_mes,
        'escolas': escolas_com_plano,
        'logs_recentes': logs_recentes,
        'total_professores': professores.count(),
    })


@_master_required
def master_criar_escola(request):
    if request.method == 'GET':
        return render(request, 'ita_core/master_criar_escola.html')

    nome = request.POST.get('nome', '').strip()
    email = request.POST.get('email', '').strip().lower()
    senha = request.POST.get('senha', '').strip()
    plano = request.POST.get('plano', 'trial')
    dias_trial = int(request.POST.get('dias_trial', 7))

    if not nome or not email or not senha:
        return render(request, 'ita_core/master_criar_escola.html', {
            'erro': 'Nome, email e senha são obrigatórios.'
        })

    if Professor.objects.filter(email=email).exists():
        return render(request, 'ita_core/master_criar_escola.html', {
            'erro': f'Já existe um usuário com o email {email}.'
        })

    # Cria Tenant (escola)
    dominio = email.split('@')[0].lower().replace('+', '').replace('.', '')
    tenant = Tenant.objects.create(nome=nome, dominio=f'{dominio}.itatecnologia.local')

    # Cria Professor do tipo escola
    professor = Professor.objects.create_user(
        username=email,
        email=email,
        password=senha,
        first_name=nome,
        type_user='school',
        tenant=tenant,
        escola=nome,
        email_confirmado=True,
        status_aprovacao='aprovado',
        is_active=True,
    )

    # Cria plano
    valor_map = {'trial': 0, 'professor': 29, 'escola': 99}
    vencimento = timezone.now().date() + timedelta(days=dias_trial if plano == 'trial' else 30)
    PlanoEscola.objects.create(
        tenant=tenant,
        plano=plano,
        inicio=timezone.now().date(),
        vencimento=vencimento,
        valor_mensal=valor_map.get(plano, 0),
        status=plano if plano == 'trial' else 'ativo',
    )

    _log(request, 'master', 'escola_criada', {'nome': nome, 'email': email, 'plano': plano})
    messages.success(request, f'Escola "{nome}" criada com sucesso! Email: {email}')
    return redirect('/master/dashboard/')


@_master_required
def master_editar_escola(request, escola_id):
    tenant = get_object_or_404(Tenant, pk=escola_id)
    try:
        plano_obj = tenant.plano_escola
    except PlanoEscola.DoesNotExist:
        plano_obj = None

    if request.method == 'GET':
        return render(request, 'ita_core/master_editar_escola.html', {
            'tenant': tenant,
            'plano_obj': plano_obj,
        })

    # Atualiza dados
    tenant.nome = request.POST.get('nome', tenant.nome).strip()
    tenant.save(update_fields=['nome'])

    if plano_obj:
        plano_obj.plano = request.POST.get('plano', plano_obj.plano)
        plano_obj.status = request.POST.get('status', plano_obj.status)
        dias = int(request.POST.get('dias_adicionar', 0))
        if dias > 0:
            plano_obj.vencimento += timedelta(days=dias)
        plano_obj.save()

    messages.success(request, f'Escola "{tenant.nome}" atualizada.')
    _log(request, 'master', 'escola_editada', {'tenant_id': escola_id})
    return redirect('/master/dashboard/')


@_master_required
def master_bloquear_escola(request, escola_id):
    tenant = get_object_or_404(Tenant, pk=escola_id)
    try:
        plano_obj = tenant.plano_escola
        novo_status = 'ativo' if plano_obj.status == 'bloqueado' else 'bloqueado'
        plano_obj.status = novo_status
        plano_obj.save(update_fields=['status'])
        # Invalida sessões SSO ativas dos usuários deste tenant
        SessaoSSO.objects.filter(usuario__tenant=tenant, ativa=True).update(ativa=False)
        acao = 'desbloqueada' if novo_status == 'ativo' else 'bloqueada'
        messages.success(request, f'Escola "{tenant.nome}" {acao}.')
        _log(request, 'master', f'escola_{acao}', {'tenant_id': escola_id})
    except PlanoEscola.DoesNotExist:
        messages.error(request, 'Escola sem plano cadastrado.')
    return redirect('/master/dashboard/')


@_master_required
def master_sessoes(request):
    sessoes = SessaoSSO.objects.select_related('usuario').order_by('-criada_em')[:100]
    return render(request, 'ita_core/master_sessoes.html', {'sessoes': sessoes})


@_master_required
def master_forcar_logout(request, escola_id):
    tenant = get_object_or_404(Tenant, pk=escola_id)
    count = SessaoSSO.objects.filter(usuario__tenant=tenant, ativa=True).update(ativa=False)
    _log(request, 'master', 'logout_forcado', {'tenant_id': escola_id, 'sessoes': count})
    messages.success(request, f'{count} sessão(ões) encerrada(s) para "{tenant.nome}".')
    return redirect('/master/dashboard/')


# ─────────────────────────────────────────────────────────────
# MÓDULOS STUB — Relatórios e Gestão de Professores
# ─────────────────────────────────────────────────────────────

def modulo_relatorios(request):
    if not request.user.is_authenticated:
        return redirect('/login/?next=/relatorios/')
    payload = getattr(request, 'sso_payload', None)

    from corretor.core.models import Avaliacao, Resultado
    from django.db.models import Avg

    avaliacoes = Avaliacao.objects.filter(professor=request.user).prefetch_related('resultados')
    resultados = Resultado.objects.filter(avaliacao__professor=request.user).select_related('avaliacao')

    total_resultados = resultados.count()
    media_geral = resultados.aggregate(Avg('nota'))['nota__avg'] or 0
    aprovados = resultados.filter(nota__gte=5).count()
    taxa_aprovacao = round(aprovados / total_resultados * 100, 1) if total_resultados > 0 else 0

    # Por disciplina
    disciplinas = {}
    for av in avaliacoes:
        disc = av.disciplina or 'Sem disciplina'
        if disc not in disciplinas:
            disciplinas[disc] = {'avaliacoes': 0, 'notas': [], 'turmas': set()}
        disciplinas[disc]['avaliacoes'] += 1
        disciplinas[disc]['turmas'].add(av.turma)
        for r in av.resultados.all():
            if r.nota is not None:
                disciplinas[disc]['notas'].append(r.nota)

    disciplinas_lista = []
    for disc, data in sorted(disciplinas.items()):
        notas = data['notas']
        disciplinas_lista.append({
            'nome': disc,
            'total_avaliacoes': data['avaliacoes'],
            'total_alunos': len(notas),
            'media': round(sum(notas) / len(notas), 2) if notas else 0,
            'aprovacao': round(sum(1 for n in notas if n >= 5) / len(notas) * 100, 1) if notas else 0,
            'turmas': ', '.join(sorted(data['turmas'])),
        })

    # Por aluno com detalhe de questões
    alunos_dict = {}
    for r in resultados:
        key = (r.aluno_nome, r.turma)
        if key not in alunos_dict:
            alunos_dict[key] = []

        questoes = []
        gabarito = r.avaliacao.gabarito or {}
        for q_num in sorted(gabarito.keys(), key=lambda x: int(x)):
            resp_correta = gabarito[q_num]
            resp_aluno = r.respostas.get(str(q_num), '-') if r.respostas else '-'
            questoes.append({
                'numero': q_num,
                'aluno': resp_aluno,
                'correta': resp_correta,
                'acertou': resp_aluno == resp_correta,
            })

        alunos_dict[key].append({
            'avaliacao': r.avaliacao.titulo,
            'disciplina': r.avaliacao.disciplina,
            'turma': r.turma,
            'nota': r.nota,
            'acertos': r.acertos,
            'erros': r.erros,
            'total_questoes': r.avaliacao.numero_questoes,
            'data': r.data_correcao,
            'questoes': questoes,
        })

    alunos_lista = sorted([
        {
            'nome': k[0],
            'turma': k[1],
            'provas': v,
            'total_provas': len(v),
            'media': round(sum(p['nota'] for p in v if p['nota'] is not None) / len(v), 2) if v else 0,
        }
        for k, v in alunos_dict.items()
    ], key=lambda x: x['nome'])

    return render(request, 'ita_core/relatorios.html', {
        'total_avaliacoes': avaliacoes.count(),
        'total_correcoes': total_resultados,
        'total_alunos': len(alunos_lista),
        'media_geral': round(media_geral, 2),
        'taxa_aprovacao': taxa_aprovacao,
        'avaliacoes': avaliacoes.order_by('-data_criacao'),
        'disciplinas_lista': disciplinas_lista,
        'alunos_lista': alunos_lista,
        'usuario': request.user,
        'plano_atual': payload.get('plano', '') if payload else '',
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


def modulo_gestao_professores(request):
    if not request.user.is_authenticated:
        return redirect('/login/?next=/gestao-professores/')
    payload = getattr(request, 'sso_payload', None)
    if payload and 'gestao_professores' not in payload.get('modulos', []):
        return redirect('/portal/')

    from gamificaedu.accounts.models import Professor as ProfModel
    tenant = getattr(request.user, 'tenant', None)
    professores = ProfModel.objects.filter(tenant=tenant).exclude(pk=request.user.pk) if tenant else ProfModel.objects.none()

    return render(request, 'ita_core/gestao_professores.html', {
        'professores': professores,
        'usuario': request.user,
        'plano_atual': payload.get('plano', '') if payload else '',
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


# ─────────────────────────────────────────────────────────────
# REDIRECT RAIZ
# ─────────────────────────────────────────────────────────────

def redirect_raiz(request):
    token = sso.obter_token_do_request(request)
    if token and sso.decodificar_token_sso(token):
        return redirect('/portal/')
    return redirect('/login/')

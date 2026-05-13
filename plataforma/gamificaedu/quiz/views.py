import csv
import json

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .models import (
    AlunoPin, Quiz, Questao, Alternativa,
    RegistroAcessoProva, RespostaUsuario, ResultadoQuiz, TentativaSuspeita,
)


# ── Helper: obtém IP real mesmo por trás de proxy/nginx ───────────
def _obter_ip(request):
    """Retorna o IP real do cliente considerando cabeçalhos de proxy."""
    ip_forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if ip_forwarded:
        return ip_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


# ── Helper: concede badge "Acesso Autenticado" (apenas 1 vez) ─────
def _conceder_badge_acesso_autenticado(usuario):
    """
    Cria o badge 'Acesso Autenticado' no tenant do usuário (se não existir)
    e o concede ao usuário na primeira verificação bem-sucedida.
    Não concede XP — é apenas um badge de segurança.
    Retorna True se o badge foi concedido agora, False se já tinha.
    """
    try:
        from gamificaedu.gamification.models import Conquista, ConquistaUsuario
        tenant = getattr(usuario, 'tenant', None)

        # Busca ou cria o badge de segurança
        badge, _ = Conquista.objects.get_or_create(
            titulo='Acesso Autenticado',
            tenant=tenant,
            defaults={
                'descricao': 'Verificou a identidade para acessar uma avaliação com segurança.',
                'icone': 'fa-shield-alt',
                'pontos_necessarios': 0,
            },
        )

        # Só concede se ainda não tem
        if not ConquistaUsuario.objects.filter(usuario=usuario, conquista=badge).exists():
            ConquistaUsuario.objects.create(
                usuario=usuario,
                conquista=badge,
                tenant=tenant,
            )
            return True   # badge concedido agora
        return False      # já possuía o badge
    except Exception:
        # Falha silenciosa — não bloqueia o fluxo de verificação
        return False


@login_required
def lista_quizzes(request):
    quizzes = Quiz.objects.filter(ativo=True)
    payload = getattr(request, 'sso_payload', None)
    return render(request, 'quiz/lista.html', {
        'quizzes': quizzes,
        'usuario': request.user,
        'plano_atual': payload.get('plano', '') if payload else getattr(request.user, 'plano', ''),
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


@login_required
def criar_quiz(request):
    if not (request.user.is_staff or request.user.is_superuser):
        messages.error(request, 'Apenas professores podem criar quizzes.')
        return redirect('lista_quizzes')

    if request.method == 'POST':
        titulo = request.POST.get('titulo', '').strip()
        descricao = request.POST.get('descricao', '').strip()
        tempo = int(request.POST.get('tempo_por_questao', 30))
        tenant = getattr(request.user, 'tenant', None)

        if not titulo:
            messages.error(request, 'O título é obrigatório.')
        elif not tenant:
            messages.error(request, 'Seu usuário não está associado a uma escola.')
        else:
            quiz = Quiz.objects.create(
                titulo=titulo,
                descricao=descricao,
                tempo_por_questao=tempo,
                professor=request.user,
                tenant=tenant,
            )
            return redirect('editar_quiz', quiz_id=quiz.pk)

    payload = getattr(request, 'sso_payload', None)
    return render(request, 'quiz/criar.html', {
        'usuario': request.user,
        'plano_atual': payload.get('plano', '') if payload else getattr(request.user, 'plano', ''),
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


@login_required
def editar_quiz(request, quiz_id):
    quiz = get_object_or_404(Quiz, pk=quiz_id)
    if not (request.user.is_staff or request.user.is_superuser or quiz.professor == request.user):
        messages.error(request, 'Sem permissão para editar este quiz.')
        return redirect('lista_quizzes')

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_quiz':
            quiz.titulo = request.POST.get('titulo', quiz.titulo).strip()
            quiz.descricao = request.POST.get('descricao', quiz.descricao).strip()
            quiz.tempo_por_questao = int(request.POST.get('tempo_por_questao', quiz.tempo_por_questao))
            quiz.save()
            messages.success(request, 'Quiz atualizado!')

        elif action == 'add_questao':
            texto = request.POST.get('texto', '').strip()
            alternativas = [request.POST.get(f'alt_{i}', '').strip() for i in range(4)]
            correta_idx = int(request.POST.get('correta', 0))

            if texto and any(alternativas):
                ordem = quiz.questoes.count()
                questao = Questao.objects.create(quiz=quiz, texto=texto, ordem=ordem)
                for i, alt_texto in enumerate(alternativas):
                    if alt_texto:
                        Alternativa.objects.create(
                            questao=questao,
                            texto=alt_texto,
                            correta=(i == correta_idx),
                        )
                messages.success(request, 'Questão adicionada!')
            else:
                messages.error(request, 'Preencha a pergunta e ao menos uma alternativa.')

        elif action == 'delete_questao':
            questao_id = request.POST.get('questao_id')
            Questao.objects.filter(pk=questao_id, quiz=quiz).delete()
            _reordenar_questoes(quiz)
            messages.success(request, 'Questão removida.')

        return redirect('editar_quiz', quiz_id=quiz.pk)

    payload = getattr(request, 'sso_payload', None)
    return render(request, 'quiz/editar.html', {
        'quiz': quiz,
        'questoes': quiz.questoes.prefetch_related('alternativas'),
        'usuario': request.user,
        'plano_atual': payload.get('plano', '') if payload else getattr(request.user, 'plano', ''),
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


def _reordenar_questoes(quiz):
    for i, q in enumerate(quiz.questoes.all()):
        q.ordem = i
        q.save(update_fields=['ordem'])


@login_required
def jogar_quiz(request, quiz_id):
    quiz = get_object_or_404(Quiz, pk=quiz_id, ativo=True)

    # ── Verificação de identidade ──────────────────────────────────
    # A chave de sessão confirma que o aluno passou pela verificação
    # nesta sessão. O modal de PIN é mostrado no template se não autorizado.
    sessao_key = f'quiz_autorizado_{quiz_id}'
    ja_autorizado = (request.session.get(sessao_key) == request.user.pk)

    # Verifica se o aluno já configurou um PIN
    tem_pin = AlunoPin.objects.filter(usuario=request.user).exists()

    questoes_data = []
    for q in quiz.questoes.prefetch_related('alternativas'):
        alts = list(q.alternativas.values('id', 'texto', 'correta'))
        questoes_data.append({
            'id': q.id,
            'texto': q.texto,
            'alternativas': alts,
        })

    payload = getattr(request, 'sso_payload', None)
    return render(request, 'quiz/jogar.html', {
        'quiz': quiz,
        'questoes_json': json.dumps(questoes_data, ensure_ascii=False),
        'usuario': request.user,
        'ja_autorizado': ja_autorizado,
        'tem_pin': tem_pin,
        'plano_atual': payload.get('plano', '') if payload else getattr(request.user, 'plano', ''),
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


@login_required
@require_POST
def salvar_resultado(request, quiz_id):
    quiz = get_object_or_404(Quiz, pk=quiz_id)

    # ── Proteção: rejeita envio se o aluno não passou pela verificação ──
    sessao_key = f'quiz_autorizado_{quiz_id}'
    if request.session.get(sessao_key) != request.user.pk:
        # Registra como tentativa suspeita
        TentativaSuspeita.objects.create(
            aluno_tentado=str(request.user.email),
            quiz=quiz,
            ip=_obter_ip(request),
            motivo='Tentativa de enviar respostas sem autorização de identidade',
        )
        return JsonResponse(
            {'erro': 'Acesso não autorizado. Confirme sua identidade antes de iniciar a avaliação.'},
            status=403,
        )

    try:
        dados = json.loads(request.body)
        respostas = dados.get('respostas', [])
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({'erro': 'Dados inválidos'}, status=400)

    acertos = 0
    resultado = ResultadoQuiz.objects.create(
        usuario=request.user,
        quiz=quiz,
        acertos=0,
        total=len(respostas),
    )

    for r in respostas:
        questao_id = r.get('questao_id')
        alt_id = r.get('alternativa_id')
        questao = Questao.objects.filter(pk=questao_id, quiz=quiz).first()
        if not questao:
            continue
        alternativa = Alternativa.objects.filter(pk=alt_id, questao=questao).first() if alt_id else None
        correta = bool(alternativa and alternativa.correta)
        if correta:
            acertos += 1
        RespostaUsuario.objects.create(
            resultado=resultado,
            questao=questao,
            alternativa_escolhida=alternativa,
            correta=correta,
        )

    resultado.acertos = acertos
    resultado.save(update_fields=['acertos'])

    return JsonResponse({'resultado_id': resultado.pk})


@login_required
def ver_resultado(request, resultado_id):
    resultado = get_object_or_404(ResultadoQuiz, pk=resultado_id, usuario=request.user)
    respostas = resultado.respostas.select_related(
        'questao', 'alternativa_escolhida'
    ).prefetch_related('questao__alternativas')

    payload = getattr(request, 'sso_payload', None)
    return render(request, 'quiz/resultado.html', {
        'resultado': resultado,
        'respostas': respostas,
        'usuario': request.user,
        'plano_atual': payload.get('plano', '') if payload else getattr(request.user, 'plano', ''),
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


# ══════════════════════════════════════════════════════════════════
# ENDPOINTS DE SEGURANÇA
# ══════════════════════════════════════════════════════════════════

@login_required
@require_POST
def verificar_pin(request):
    """
    POST /quiz/api/verificar-pin/

    Verifica o PIN de segurança do aluno antes de iniciar o quiz.
    Payload JSON esperado:
        { "pin": "123456", "quiz_id": 42 }

    Em caso de sucesso:
        - Grava a chave de sessão 'quiz_autorizado_<quiz_id>'
        - Registra o acesso em RegistroAcessoProva
        - Concede o badge 'Acesso Autenticado' (1ª vez apenas)
        - Retorna {"autorizado": true, "badge_concedido": bool}

    Em caso de falha:
        - Incrementa tentativas_falhas no AlunoPin
        - Após 3 falhas: bloqueia por 10 min e registra TentativaSuspeita
        - Retorna {"autorizado": false, "erro": "...", "tentativas_restantes": N}
    """
    try:
        dados = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'autorizado': False, 'erro': 'Dados inválidos'}, status=400)

    pin_texto = str(dados.get('pin', '')).strip()
    quiz_id   = dados.get('quiz_id')

    if not pin_texto or not quiz_id:
        return JsonResponse({'autorizado': False, 'erro': 'PIN e quiz_id são obrigatórios'}, status=400)

    quiz = get_object_or_404(Quiz, pk=quiz_id)

    # Verifica se o aluno possui PIN cadastrado
    try:
        aluno_pin = AlunoPin.objects.get(usuario=request.user)
    except AlunoPin.DoesNotExist:
        return JsonResponse({'autorizado': False, 'erro': 'Nenhum PIN cadastrado. Use verificação via CEITEC ID.'}, status=400)

    # Verifica se está bloqueado
    if aluno_pin.esta_bloqueado:
        return JsonResponse({
            'autorizado':  False,
            'bloqueado':   True,
            'erro': 'Muitas tentativas incorretas. Descanse um pouco e tente novamente em 10 minutos.',
        })

    # Verifica o PIN
    if not aluno_pin.verificar(pin_texto):
        aluno_pin.registrar_tentativa_falha(quiz=quiz)
        restantes = aluno_pin.tentativas_restantes
        if aluno_pin.esta_bloqueado:
            return JsonResponse({
                'autorizado': False,
                'bloqueado':  True,
                'erro': 'Muitas tentativas incorretas. Descanse um pouco e tente novamente em 10 minutos.',
            })
        return JsonResponse({
            'autorizado':         False,
            'tentativas_restantes': restantes,
            'erro': f'PIN incorreto. Você ainda tem {restantes} tentativa{"s" if restantes != 1 else ""}.',
        })

    # ── PIN correto ────────────────────────────────────────────────
    aluno_pin.registrar_sucesso()

    # Grava autorização na sessão
    sessao_key = f'quiz_autorizado_{quiz_id}'
    request.session[sessao_key] = request.user.pk

    # Registra o acesso com método PIN
    RegistroAcessoProva.objects.create(
        aluno=request.user,
        quiz=quiz,
        ip=_obter_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        metodo_autenticacao='pin',
    )

    # Concede badge de segurança (1ª vez)
    badge_concedido = _conceder_badge_acesso_autenticado(request.user)

    return JsonResponse({
        'autorizado':     True,
        'badge_concedido': badge_concedido,
    })


@login_required
@require_POST
def registro_acesso(request):
    """
    POST /quiz/api/registro-acesso/

    Registra um acesso via CEITEC ID (SSO) sem necessidade de PIN.
    Chamado pelo JS quando o aluno não possui PIN cadastrado ou
    prefere verificar apenas com o login SSO.

    Payload JSON esperado:
        { "quiz_id": 42 }

    Retorna {"autorizado": true, "badge_concedido": bool}
    """
    try:
        dados = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'autorizado': False, 'erro': 'Dados inválidos'}, status=400)

    quiz_id = dados.get('quiz_id')
    if not quiz_id:
        return JsonResponse({'autorizado': False, 'erro': 'quiz_id é obrigatório'}, status=400)

    quiz = get_object_or_404(Quiz, pk=quiz_id)

    # Grava autorização na sessão
    sessao_key = f'quiz_autorizado_{quiz_id}'
    request.session[sessao_key] = request.user.pk

    # Registra o acesso com método SSO
    RegistroAcessoProva.objects.create(
        aluno=request.user,
        quiz=quiz,
        ip=_obter_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        metodo_autenticacao='sso',
    )

    # Concede badge de segurança (1ª vez)
    badge_concedido = _conceder_badge_acesso_autenticado(request.user)

    return JsonResponse({
        'autorizado':      True,
        'badge_concedido': badge_concedido,
    })


# ══════════════════════════════════════════════════════════════════
# PAINEL DO PROFESSOR — Segurança das Avaliações
# ══════════════════════════════════════════════════════════════════

@login_required
def painel_seguranca_professor(request):
    """
    GET /quiz/professor/seguranca/

    Seção de segurança do painel do professor. Mostra:
      - PINs cadastrados por aluno (do mesmo tenant)
      - Registros de acesso por quiz
      - Tentativas suspeitas

    Acessível apenas a usuários com is_staff=True.
    Suporta exportação CSV via ?exportar=acessos ou ?exportar=suspeitas
    """
    if not request.user.is_staff:
        messages.error(request, 'Acesso restrito a professores.')
        return redirect('/itagame/')

    tenant = getattr(request.user, 'tenant', None)

    # Filtra pelo tenant da escola do professor
    pins = (
        AlunoPin.objects
        .filter(usuario__tenant=tenant)
        .select_related('usuario')
        .order_by('usuario__first_name')
    )
    acessos = (
        RegistroAcessoProva.objects
        .filter(quiz__tenant=tenant)
        .select_related('aluno', 'quiz')
        .order_by('-timestamp')[:200]
    )
    suspeitas = (
        TentativaSuspeita.objects
        .filter(quiz__tenant=tenant)
        .select_related('quiz')
        .order_by('-timestamp')[:100]
    )

    # ── Exportação CSV — registros de acesso ──────────────────────
    if request.GET.get('exportar') == 'acessos':
        resp = HttpResponse(content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = 'attachment; filename="acessos_quizzes.csv"'
        resp.write('﻿')  # BOM para Excel
        writer = csv.writer(resp, delimiter=';')
        writer.writerow(['Aluno', 'Email', 'Quiz', 'Método', 'IP', 'Data/Hora'])
        for a in acessos:
            writer.writerow([
                a.aluno.get_full_name() or a.aluno.email,
                a.aluno.email,
                str(a.quiz),
                a.get_metodo_autenticacao_display(),
                a.ip or '—',
                a.timestamp.strftime('%d/%m/%Y %H:%M:%S'),
            ])
        return resp

    # ── Exportação CSV — tentativas suspeitas ─────────────────────
    if request.GET.get('exportar') == 'suspeitas':
        resp = HttpResponse(content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = 'attachment; filename="tentativas_suspeitas.csv"'
        resp.write('﻿')
        writer = csv.writer(resp, delimiter=';')
        writer.writerow(['Aluno/ID Tentado', 'Quiz', 'IP', 'Motivo', 'Data/Hora'])
        for s in suspeitas:
            writer.writerow([
                s.aluno_tentado,
                str(s.quiz),
                s.ip or '—',
                s.motivo,
                s.timestamp.strftime('%d/%m/%Y %H:%M:%S'),
            ])
        return resp

    payload = getattr(request, 'sso_payload', None)
    return render(request, 'quiz/painel_seguranca.html', {
        'pins':     pins,
        'acessos':  acessos,
        'suspeitas': suspeitas,
        'usuario':  request.user,
        'plano_atual':    payload.get('plano', '')         if payload else getattr(request.user, 'plano', ''),
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })

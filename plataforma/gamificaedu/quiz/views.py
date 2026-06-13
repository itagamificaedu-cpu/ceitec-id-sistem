import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib import messages
from .models import Quiz, Questao, Alternativa, ResultadoQuiz, RespostaUsuario


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
        'plano_atual': payload.get('plano', '') if payload else getattr(request.user, 'plano', ''),
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


@login_required
@require_POST
def salvar_resultado(request, quiz_id):
    quiz = get_object_or_404(Quiz, pk=quiz_id)
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

from django.urls import path

from . import views

urlpatterns = [
    # ── Listagem e CRUD de quizzes ─────────────────────────────────
    path('',                              views.lista_quizzes,   name='lista_quizzes'),
    path('criar/',                        views.criar_quiz,      name='criar_quiz'),
    path('<int:quiz_id>/editar/',         views.editar_quiz,     name='editar_quiz'),

    # ── Jogo / avaliação ──────────────────────────────────────────
    path('<int:quiz_id>/jogar/',          views.jogar_quiz,      name='jogar_quiz'),
    path('<int:quiz_id>/salvar/',         views.salvar_resultado, name='salvar_resultado'),
    path('resultado/<int:resultado_id>/', views.ver_resultado,   name='ver_resultado'),

    # ── API de segurança — verificação de identidade ───────────────
    # POST /quiz/api/verificar-pin/     → verifica PIN do aluno
    # POST /quiz/api/registro-acesso/   → registra acesso via SSO
    path('api/verificar-pin/',    views.verificar_pin,    name='verificar_pin'),
    path('api/registro-acesso/',  views.registro_acesso,  name='registro_acesso'),

    # ── Painel do professor — segurança das avaliações ─────────────
    # GET /quiz/professor/seguranca/
    path('professor/seguranca/',  views.painel_seguranca_professor, name='painel_seguranca_professor'),
]

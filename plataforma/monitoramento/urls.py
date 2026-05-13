from django.urls import path

from . import views

app_name = 'monitoramento'

urlpatterns = [
    # ── API — recebe eventos do JavaScript do aluno ────────────────
    # Chamada por: POST /api/monitoramento/registrar/
    path(
        'api/monitoramento/registrar/',
        views.registrar_evento,
        name='registrar',
    ),

    # ── Relatório do professor ─────────────────────────────────────
    # Exemplo ItagGame:  /professor/monitoramento/42/
    # Exemplo Corretor:  /professor/monitoramento/3fa85f64-5717-4562-b3fc.../
    path(
        'professor/monitoramento/<str:prova_id>/',
        views.relatorio_professor,
        name='relatorio',
    ),
]

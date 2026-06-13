from django.urls import path
from . import api_views

urlpatterns = [
    # Dashboard unificado — dados agregados de todos os sistemas
    path('dashboard/', api_views.dashboard_unificado, name='api_dashboard'),

    # Professores / Usuários
    path('professores/', api_views.lista_professores, name='api_professores'),
    path('professores/<int:pk>/', api_views.detalhe_professor, name='api_professor_detalhe'),

    # Planos e assinaturas
    path('planos/', api_views.lista_planos, name='api_planos'),
    path('assinar/<str:plano>/', api_views.assinar_plano, name='api_assinar'),
    path('webhook/mercadopago/', api_views.webhook_mercadopago, name='api_webhook_mp'),

    # Gamification (ponte entre Node.js e Django)
    path('gamification/perfil/', api_views.perfil_gamificacao, name='api_gamificacao_perfil'),

    # Corretor (bridge)
    path('corretor/avaliacoes/', api_views.lista_avaliacoes_corretor, name='api_avaliacoes_corretor'),

    # Repositório
    path('repositorio/', api_views.lista_ferramentas, name='api_repositorio'),
]

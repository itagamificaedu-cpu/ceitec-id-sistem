from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='corretor_home'),
    path('logout/', views.logout_view, name='logout'),
    path('registro/', views.registro_view, name='registro'),
    
    path('home/', views.home, name='home'),
    
    path('avaliacoes/', views.lista_avaliacoes, name='lista_avaliacoes'),
    path('avaliacoes/criar/', views.criar_avaliacao, name='criar_avaliacao'),
    path('avaliacoes/<uuid:pk>/', views.detalhar_avaliacao, name='detalhar_avaliacao'),
    path('avaliacoes/<uuid:pk>/editar/', views.editar_avaliacao, name='editar_avaliacao'),
    path('avaliacoes/<uuid:pk>/excluir/', views.excluir_avaliacao, name='excluir_avaliacao'),
    path('avaliacoes/<uuid:pk>/pdf/', views.gerar_pdf, name='gerar_pdf_gabarito'),
    
    path('correcao/', views.correcao, name='correcao'),
    path('correcao/lote/', views.correcao_lote, name='correcao_lote'),
    path('api/corrigir-lote/', views.api_corrigir_lote, name='api_corrigir_lote'),
    path('api/get-alunos-turma/<uuid:avaliacao_id>/', views.api_get_alunos_turma, name='api_get_alunos_turma'),
    path('resultados/', views.lista_resultados, name='lista_resultados'),
    
    path('dashboard/', views.dashboard, name='dashboard'),
    path('importar/', views.exportar_view, name='exportar'),
    path('importar/alunos/', views.importar_alunos_view, name='importar_alunos'),
    path('exportar/excel/', views.exportar_excel, name='exportar_excel'),
    
    path('api/corrigir/', views.api_corrigir, name='api_corrigir'),
    
    # Prova Online (V71)
    path('publica/prova/<uuid:pk>/', views.prova_online, name='prova_online'),
    path('publica/prova/<uuid:pk>/qr/', views.prova_online_qr, name='prova_online_qr'),
    path('api/responder-prova-online/<uuid:pk>/', views.responder_prova_online, name='responder_prova_online'),
    path('api/aluno-tentativa/<uuid:pk>/', views.api_aluno_tentativa, name='api_aluno_tentativa'),
    
    # QR Code Access
    path('avaliacoes/<uuid:pk>/qr/', views.gerar_qr_prova, name='gerar_qr_prova'),
    path('api/revogar-token/<uuid:pk>/', views.api_revogar_token, name='api_revogar_token'),
    path('api/limpar-tokens/<uuid:avaliacao_id>/', views.api_limpar_tokens_expirados, name='api_limpar_tokens_expirados'),
    
    # Modo Sala
    path('avaliacoes/<uuid:pk>/modo-sala/', views.modo_sala, name='modo_sala'),
    path('api/modo-sala/<uuid:pk>/', views.api_modo_sala, name='api_modo_sala'),
    
    # Gestão de Resultados (V78)
    path('resultados/<uuid:pk>/editar/', views.editar_resultado, name='editar_resultado'),
    path('resultados/<uuid:pk>/excluir/', views.excluir_resultado, name='excluir_resultado'),

    # API JSON para Dashboard CEITEC
    path('api/resultados-json/', views.api_resultados_json, name='api_resultados_json'),

    # Sync de alunos do sistema ITA → corretor
    path('api/sync-alunos/', views.api_sync_alunos, name='api_sync_alunos'),
]

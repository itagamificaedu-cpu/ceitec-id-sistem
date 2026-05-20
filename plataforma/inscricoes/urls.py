from django.urls import path
from . import views

app_name = 'inscricoes'

urlpatterns = [
    path('', views.landing_page, name='landing'),
    path('formulario/', views.formulario_inscricao, name='formulario'),
    path('pagamento/<uuid:codigo>/', views.pagamento_inscricao, name='pagamento'),
    path('pagamento/notificacao/', views.webhook_pagseguro, name='webhook'),
    path('pagamento/confirmado/<uuid:codigo>/', views.pagamento_confirmado, name='confirmado'),
    path('certificado/<uuid:codigo>/', views.gerar_certificado, name='certificado'),
    path('certificado/<uuid:codigo>/visualizar/', views.visualizar_certificado, name='visualizar'),
    path('verificar/', views.verificar_certificado, name='verificar'),
    path('verificar/<str:codigo>/', views.verificar_certificado, name='verificar_codigo'),
    path('vagas/', views.verificar_vagas, name='vagas'),
    path('lista-espera/', views.lista_espera, name='lista_espera'),
    path('api/inscricoes/', views.api_lista_inscricoes, name='api_inscricoes'),
    path('api/inscricao/<uuid:codigo>/pagar/', views.api_marcar_pago_react, name='api_marcar_pago_react'),
    path('api/inscricao/<uuid:codigo>/editar/', views.api_editar_inscricao, name='api_editar_inscricao'),
    path('api/inscricao/<uuid:codigo>/excluir/', views.api_excluir_inscricao, name='api_excluir_inscricao'),
    path('api/inscricao/<uuid:codigo>/certificado/', views.api_emitir_certificado_react, name='api_emitir_cert_react'),
    # ─── Presença ──────────────────────────────────────────────────────────────
    path('api/presencas/', views.api_presencas_lista, name='api_presencas'),
    path('api/presencas/registrar/', views.api_registrar_presenca, name='api_registrar_presenca'),
    path('api/presencas/resumo/', views.api_presencas_resumo, name='api_presencas_resumo'),
    path('api/carteirinhas/', views.api_carteirinhas, name='api_carteirinhas'),
    path('api/presencas/scan/', views.api_scan_presenca, name='api_scan_presenca'),
    path('painel/', views.painel_admin, name='painel'),
    path('painel/exportar-csv/', views.exportar_csv, name='exportar_csv'),
    path('painel/certificado/<uuid:codigo>/emitir/', views.emitir_certificado_admin, name='emitir_cert'),
    path('painel/inscricao/<uuid:codigo>/pago/', views.marcar_como_pago, name='marcar_pago'),
]

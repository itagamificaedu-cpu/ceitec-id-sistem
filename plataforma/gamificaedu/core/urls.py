from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('sobre/', views.sobre, name='sobre'),
    path('dashboard/', views.dashboard, name='dashboard'),
        # ... suas outras rotas ...
    path('perfil/', views.perfil, name='perfil'),
    path('ferramentas/gerador-aulas/', views.gerador_planos_aula, name='gerador_aulas'),

    # --- NOVA ROTA DE PAGAMENTO ---
    path('assinar/<str:tipo_plano>/', views.assinar_plano, name='assinar_plano'),
     # --- ROTA DO WEBHOOK ---
    path('webhook/mercadopago/', views.mercadopago_webhook, name='webhook_mp'),
        # Adicione esta linha junto com as outras rotas das ferramentas:
    path('ferramentas/gerador-provas/', views.gerador_provas_view, name='gerador_provas'),
]

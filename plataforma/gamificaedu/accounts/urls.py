from django.urls import path
from . import views

urlpatterns = [
    path('login-magico/', views.login_magico, name='login_magico'),
    path('cadastro/', views.cadastro, name='cadastro'),
    path('cadastro/sucesso/', views.cadastro_sucesso, name='cadastro_sucesso'),
    path('confirmar-email/<uuid:token>/', views.confirmar_email, name='confirmar_email'),
    path('reenviar-confirmacao/', views.reenviar_confirmacao, name='reenviar_confirmacao'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('perfil/', views.perfil, name='perfil'),
]

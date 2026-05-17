from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from ita_core.views import redirect_raiz, modulo_relatorios, modulo_gestao_professores

urlpatterns = [
    # Admin Django (emergências)
    path('django-admin/', admin.site.urls),

    # --- HUB CENTRAL (SSO + Portal + Master) ---
    path('', redirect_raiz, name='raiz'),
    path('', include('ita_core.urls')),

    # --- API REST ---
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('ita_core.api_urls')),

    # --- Módulos ---
    path('itagame/',             include('gamificaedu.gamification.urls')),
    path('accounts/',            include('gamificaedu.accounts.urls')),
    path('ferramentas/',         include('gamificaedu.ferramentas.urls')),
    path('repositorio/',         include('gamificaedu.ferramentas.urls')),  # alias
    path('quiz/',                include('gamificaedu.quiz.urls')),
    path('corretor/',            include('corretor.core.urls')),
    path('relatorios/',          modulo_relatorios,          name='relatorios'),
    path('pedagogico/',          modulo_relatorios,          name='pedagogico'),
    path('gestao-professores/',  modulo_gestao_professores,  name='gestao_professores'),

    # Rotas legacy do gamificaedu.core (URLs usadas em templates existentes)
    path('', include('gamificaedu.core.urls')),

    # ── Inscrições Curso de Férias Maker ──────────────────────────
    # /inscricao/            → formulário público
    # /inscricao/painel/     → painel admin (staff only)
    # /inscricao/verificar/  → verificação de certificados
    path('inscricao/', include('inscricoes.urls', namespace='inscricoes')),

    # ── Monitoramento de foco (anti-cheat) ────────────────────────
    # /api/monitoramento/registrar/          ← recebe eventos do JS
    # /professor/monitoramento/<prova_id>/   ← relatório do professor
    path('', include('monitoramento.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

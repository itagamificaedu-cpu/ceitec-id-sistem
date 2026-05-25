"""
URLs do Dia do Desafio — CEITEC Itapipoca

Área pública (sem login):
  /desafio/                          → página de inscrição
  /desafio/inscricao/                → endpoint POST para gravar inscrição
  /desafio/comprovante/<numero>/     → download do comprovante em PDF
  /desafio/atividades/<cat_id>/      → retorna atividades (JSON) por categoria

Área admin (is_staff):
  /desafio/admin/                    → dashboard em tempo real
  /desafio/admin/stats/              → JSON de estatísticas (polling)
  /desafio/admin/lista/              → JSON de todas as inscrições
  /desafio/admin/exportar/           → download do CSV completo
  /desafio/admin/banner/             → download do banner Instagram PNG
"""
from django.urls import path
from . import views

app_name = 'desafio'

urlpatterns = [
    # ── Público ──────────────────────────────────────────────────────────────
    path('',                              views.pagina_publica_desafio, name='publico'),
    path('inscricao/',                    views.inscricao_desafio,      name='inscricao'),
    path('comprovante/<str:numero>/',     views.comprovante_pdf,        name='comprovante'),
    path('atividades/<int:categoria_id>/', views.get_atividades,        name='atividades'),

    # ── Admin (is_staff) ──────────────────────────────────────────────────────
    path('admin/',           views.dashboard_desafio, name='dashboard'),
    path('admin/stats/',     views.stats_desafio_json, name='stats'),
    path('admin/lista/',     views.lista_inscricoes,   name='lista'),
    path('admin/exportar/',  views.exportar_csv,       name='exportar'),
    path('admin/banner/',    views.banner_instagram,   name='banner'),
]

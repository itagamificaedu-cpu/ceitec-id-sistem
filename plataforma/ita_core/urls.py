from django.urls import path
from . import views

urlpatterns = [
    # Portal público
    path('login/',   views.portal_login,   name='portal_login'),
    path('logout/',  views.portal_logout,  name='portal_logout'),
    path('portal/',  views.portal_home,    name='portal_home'),

    # Master (administrador)
    path('master/',                          views.master_login,          name='master_login'),
    path('master/logout/',                   views.master_logout,         name='master_logout'),
    path('master/dashboard/',                views.master_dashboard,      name='master_dashboard'),
    path('master/criar-escola/',             views.master_criar_escola,   name='master_criar_escola'),
    path('master/editar/<int:escola_id>/',   views.master_editar_escola,  name='master_editar_escola'),
    path('master/bloquear/<int:escola_id>/', views.master_bloquear_escola,name='master_bloquear_escola'),
    path('master/forcar-logout/<int:escola_id>/', views.master_forcar_logout, name='master_forcar_logout'),
    path('master/sessoes/',                  views.master_sessoes,        name='master_sessoes'),
]

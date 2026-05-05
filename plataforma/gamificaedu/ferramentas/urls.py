from django.urls import path
from . import views

urlpatterns = [
    path('', views.lista, name='ferramentas_lista'),
    path('<int:pk>/', views.detalhe, name='ferramentas_detalhe'),
]

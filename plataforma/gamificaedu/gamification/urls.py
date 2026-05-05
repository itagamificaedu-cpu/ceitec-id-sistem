from django.urls import path
from . import views

urlpatterns = [
    path('',         views.hub,          name='itagame_hub'),
    path('ranking/', views.ranking_view, name='ranking'),
]

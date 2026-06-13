from django.urls import path
from . import views

urlpatterns = [
    path('',                              views.lista_quizzes,  name='lista_quizzes'),
    path('criar/',                        views.criar_quiz,     name='criar_quiz'),
    path('<int:quiz_id>/editar/',         views.editar_quiz,    name='editar_quiz'),
    path('<int:quiz_id>/jogar/',          views.jogar_quiz,     name='jogar_quiz'),
    path('<int:quiz_id>/salvar/',         views.salvar_resultado, name='salvar_resultado'),
    path('resultado/<int:resultado_id>/', views.ver_resultado,  name='ver_resultado'),
]

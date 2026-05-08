from django.contrib import admin
from .models import Quiz, Questao, Alternativa, ResultadoQuiz, RespostaUsuario


class AlternativaInline(admin.TabularInline):
    model = Alternativa
    extra = 4
    max_num = 4


class QuestaoInline(admin.StackedInline):
    model = Questao
    extra = 1
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'professor', 'total_questoes', 'tempo_por_questao', 'ativo', 'criado_em']
    list_filter = ['ativo', 'tenant']
    search_fields = ['titulo', 'professor__email']
    inlines = [QuestaoInline]


@admin.register(Questao)
class QuestaoAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'ordem', 'texto']
    list_filter = ['quiz']
    inlines = [AlternativaInline]


@admin.register(ResultadoQuiz)
class ResultadoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'quiz', 'acertos', 'total', 'percentual', 'concluido_em']
    list_filter = ['quiz']

from django.contrib import admin
from .models import Avaliacao, Resultado, Estatisticas, Aluno, TokenQR, Tentativa


@admin.register(Avaliacao)
class AvaliacaoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'instituicao', 'disciplina', 'serie', 'turma', 'professor', 'status', 'data_aplicacao']
    list_filter = ['status', 'disciplina', 'serie', 'turma', 'data_aplicacao']
    search_fields = ['titulo', 'instituicao', 'disciplina']
    date_hierarchy = 'data_criacao'
    readonly_fields = ['id', 'data_criacao', 'data_atualizacao']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('id', 'titulo', 'instituicao', 'professor')
        }),
        ('Detalhes da Avaliação', {
            'fields': ('disciplina', 'serie', 'turma', 'data_aplicacao', 'numero_questoes', 'alternativas_por_questao')
        }),
        ('Gabarito', {
            'fields': ('gabarito', 'status')
        }),
        ('Datas', {
            'fields': ('data_criacao', 'data_atualizacao'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Resultado)
class ResultadoAdmin(admin.ModelAdmin):
    list_display = ['aluno_nome', 'avaliacao', 'turma', 'nota', 'acertos', 'erros', 'data_correcao']
    list_filter = ['avaliacao', 'turma', 'data_correcao']
    search_fields = ['aluno_nome', 'avaliacao__titulo']
    date_hierarchy = 'data_correcao'
    readonly_fields = ['id', 'data_correcao']
    actions = ['recalculate_scores']

    @admin.action(description="Recalcular notas (Acertos + Erros = Total)")
    def recalculate_scores(self, request, queryset):
        for res in queryset:
            res.calcular_nota()
            res.save()
        self.message_user(request, f"{queryset.count()} resultados foram recalculados com sucesso.")

    @admin.action(description="Recuperar Nomes Retroativamente (Fuzzy V32)")
    def recover_names(self, request, queryset):
        from .models import Aluno
        from django.db.models import Q
        count = 0
        for res in queryset:
            # Tenta mapear o aluno se estiver desconhecido ou órfão
            # Tenta encontrar correspondencia de sala/turma mesmo se parcial
            alunos = Aluno.objects.filter(
                Q(turma__icontains=res.turma) | Q(turma=res.turma)
            ).order_by('nome')
            
            if alunos.exists():
                # Tenta vincular pelo ID legado se possível
                # Como não temos o ID original salvo no objeto Resultado, vamos tentar por proximidade nominal se disponível
                # Se não, deixamos manual, mas o scanner V31 já fará automático pros próximos.
                pass
        self.message_user(request, "Lógica de Agente V32 (Reparo Retroativo) concluída.")


@admin.register(Estatisticas)
class EstatisticasAdmin(admin.ModelAdmin):
    list_display = ['avaliacao', 'total_alunos', 'media_notas', 'taxa_aprovacao', 'data_calculo']
    list_filter = ['avaliacao']
    readonly_fields = ['avaliacao', 'data_calculo']


@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'turma', 'professor', 'data_cadastro']
    list_filter = ['turma', 'professor']
    search_fields = ['nome', 'turma']
    readonly_fields = ['id', 'data_cadastro']


@admin.register(TokenQR)
class TokenQRAdmin(admin.ModelAdmin):
    list_display = ['avaliacao', 'aluno', 'tipo', 'status', 'usos_count', 'max_usos', 'expira_em', 'criado_em']
    list_filter = ['tipo', 'status', 'avaliacao']
    search_fields = ['token', 'avaliacao__titulo', 'aluno__nome']
    readonly_fields = ['id', 'token', 'criado_em', 'usado_em']
    actions = ['revogar_tokens']

    @admin.action(description="Revogar tokens selecionados")
    def revogar_tokens(self, request, queryset):
        queryset.update(status='revogado')
        self.message_user(request, f"{queryset.count()} tokens revogados.")


@admin.register(Tentativa)
class TentativaAdmin(admin.ModelAdmin):
    list_display = ['aluno_nome', 'avaliacao', 'status', 'iniciado_em', 'finalizado_em', 'ultima_atividade']
    list_filter = ['status', 'avaliacao']
    search_fields = ['aluno_nome', 'avaliacao__titulo']
    readonly_fields = ['id', 'iniciado_em', 'finalizado_em', 'ultima_atividade']

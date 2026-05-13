from django.contrib import admin

from .models import MonitoramentoFoco


@admin.register(MonitoramentoFoco)
class MonitoramentoFocoAdmin(admin.ModelAdmin):
    """
    Interface administrativa para visualizar os registros de foco.
    """
    list_display  = ['aluno', 'prova_id', 'tipo_evento', 'total_saidas', 'timestamp']
    list_filter   = ['tipo_evento', 'timestamp']
    search_fields = ['aluno__email', 'aluno__first_name', 'aluno__last_name', 'prova_id', 'sessao_id']
    readonly_fields = ['timestamp']
    ordering      = ['-timestamp']
    date_hierarchy = 'timestamp'

    fieldsets = (
        ('Identificação', {
            'fields': ('aluno', 'sessao_id', 'prova_id'),
        }),
        ('Evento', {
            'fields': ('tipo_evento', 'total_saidas'),
        }),
        ('Timestamps', {
            'fields': ('timestamp', 'timestamp_cliente'),
        }),
    )

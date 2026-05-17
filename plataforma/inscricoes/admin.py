from django.contrib import admin
from .models import Inscricao


@admin.register(Inscricao)
class InscricaoAdmin(admin.ModelAdmin):
    list_display = [
        'codigo_curto', 'nome_completo', 'escola', 'serie',
        'turno', 'status', 'data_inscricao', 'certificado_gerado',
    ]
    list_filter = ['status', 'turno', 'nivel_experiencia', 'certificado_gerado']
    search_fields = ['nome_completo', 'nome_responsavel', 'email', 'escola']
    readonly_fields = ['codigo_inscricao', 'data_inscricao', 'data_pagamento', 'data_certificado']
    ordering = ['-data_inscricao']

    def codigo_curto(self, obj):
        return obj.codigo_curto()
    codigo_curto.short_description = 'Código'

"""
Registro dos modelos do Dia do Desafio no Django Admin.
"""
from django.contrib import admin
from .models import CategoriaDesafio, AtividadeDesafio, InscricaoDesafio


@admin.register(CategoriaDesafio)
class CategoriaDesafioAdmin(admin.ModelAdmin):
    list_display = ['icone', 'nome', 'ativo']
    list_editable = ['ativo']
    ordering = ['nome']


class AtividadeInline(admin.TabularInline):
    model = AtividadeDesafio
    extra = 1


@admin.register(AtividadeDesafio)
class AtividadeDesafioAdmin(admin.ModelAdmin):
    list_display = ['nome', 'categoria']
    list_filter = ['categoria']
    ordering = ['categoria__nome', 'nome']


@admin.register(InscricaoDesafio)
class InscricaoDesafioAdmin(admin.ModelAdmin):
    list_display = [
        'numero_inscricao', 'nome_completo', 'tipo',
        'categoria', 'atividade', 'criado_em',
    ]
    list_filter = ['tipo', 'categoria']
    search_fields = ['nome_completo', 'email', 'numero_inscricao', 'cpf']
    readonly_fields = ['numero_inscricao', 'criado_em']
    date_hierarchy = 'criado_em'
    ordering = ['-criado_em']

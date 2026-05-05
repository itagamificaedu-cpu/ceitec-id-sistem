from django.contrib import admin
from .models import Ferramenta

@admin.register(Ferramenta)
class FerramentaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'categoria', 'autor', 'criado_em', 'ativo')
    list_filter = ('categoria', 'ativo')
    search_fields = ('titulo', 'descricao')

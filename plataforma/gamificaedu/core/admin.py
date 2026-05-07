from django.contrib import admin
from .models import Assinatura

@admin.register(Assinatura)
class AssinaturaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'plano', 'ativo', 'criado_em')
    list_filter = ('plano', 'ativo')
    search_fields = ('usuario__username', 'usuario__email')
from .models import LeadProfessor

@admin.register(LeadProfessor)
class LeadProfessorAdmin(admin.ModelAdmin):
    list_display = ('nome', 'whatsapp', 'disciplina', 'criado_em')
    search_fields = ('nome', 'whatsapp')

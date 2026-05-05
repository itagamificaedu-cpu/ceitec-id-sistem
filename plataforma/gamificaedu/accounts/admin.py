from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.utils import timezone
from .models import Professor

@admin.register(Professor)
class ProfessorAdmin(UserAdmin):
    list_display = ['email', 'get_full_name', 'plano', 'status_badge', 'email_confirmado', 'criado_em']
    list_filter = ['status_aprovacao', 'plano', 'email_confirmado', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'escola']
    ordering = ['-criado_em']
    actions = ['aprovar_usuarios', 'rejeitar_usuarios']

    fieldsets = (
        ('Acesso', {'fields': ('email', 'username', 'password')}),
        ('Dados Pessoais', {'fields': ('first_name', 'last_name', 'telefone', 'cidade', 'estado')}),
        ('Dados Profissionais', {'fields': ('escola', 'disciplina', 'bio')}),
        ('Plano', {'fields': ('plano', 'plano_expira_em')}),
        ('Aprovação', {'fields': ('status_aprovacao', 'aprovado_por', 'aprovado_em', 'motivo_rejeicao')}),
        ('Email', {'fields': ('email_confirmado', 'token_expira_em')}),
        ('Segurança', {'fields': ('tentativas_login', 'bloqueado_ate', 'ultimo_login_ip')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )

    def status_badge(self, obj):
        cores = {
            'pendente': '#f97316',
            'aprovado': '#22c55e',
            'rejeitado': '#ef4444',
        }
        cor = cores.get(obj.status_aprovacao, '#888')
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;border-radius:20px;font-size:0.8rem;font-weight:700">{}</span>',
            cor, obj.get_status_aprovacao_display()
        )
    status_badge.short_description = 'Status'

    def aprovar_usuarios(self, request, queryset):
        for professor in queryset:
            professor.aprovar(request.user)
        self.message_user(request, f'{queryset.count()} professor(es) aprovado(s).')
    aprovar_usuarios.short_description = '✅ Aprovar selecionados'

    def rejeitar_usuarios(self, request, queryset):
        queryset.update(
            status_aprovacao='rejeitado',
            is_active=False
        )
        self.message_user(request, f'{queryset.count()} professor(es) rejeitado(s).')
    rejeitar_usuarios.short_description = '❌ Rejeitar selecionados'

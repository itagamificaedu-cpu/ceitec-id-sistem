from django.contrib import admin
from django.utils import timezone
from .models import (
    Inscricao,
    FormacaoIA, ModuloFormacaoIA, SessaoFormacaoIA,
    MatriculaFormacaoIA, PresencaFormacaoIA,
)


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


# ─────────────────────────────────────────────────────────────────────────────
# Formação em IA Aplicada à Educação — gestão fica 100% no Django admin (sem
# painel React próprio): lançar frequência/nota, marcar presença dos dias
# presenciais e emitir certificado.
# ─────────────────────────────────────────────────────────────────────────────

class SessaoFormacaoIAInline(admin.TabularInline):
    model = SessaoFormacaoIA
    extra = 0
    fields = ['codigo', 'titulo', 'carga_horaria', 'avaliacao_produto']


@admin.register(ModuloFormacaoIA)
class ModuloFormacaoIAAdmin(admin.ModelAdmin):
    list_display = ['curso', 'numero', 'titulo', 'formato', 'carga_horaria']
    list_filter = ['curso']
    ordering = ['curso', 'numero']
    inlines = [SessaoFormacaoIAInline]


@admin.register(FormacaoIA)
class FormacaoIAAdmin(admin.ModelAdmin):
    list_display = [
        'nome', 'edicao', 'carga_horaria_total', 'valor_inscricao',
        'vagas_total', 'vagas_usadas_admin', 'ativa',
    ]
    list_filter = ['ativa']
    readonly_fields = ['criado_em']

    def vagas_usadas_admin(self, obj):
        return obj.vagas_usadas()
    vagas_usadas_admin.short_description = 'Vagas usadas'


class PresencaFormacaoIAInline(admin.TabularInline):
    model = PresencaFormacaoIA
    extra = 0
    fields = ['dia', 'presente', 'hora_chegada', 'observacao', 'registrado_por']


@admin.register(MatriculaFormacaoIA)
class MatriculaFormacaoIAAdmin(admin.ModelAdmin):
    list_display = [
        'codigo_curto', 'nome_completo', 'instituicao_ensino', 'area_disciplina',
        'status', 'frequencia_pct', 'nota_final', 'certificado_gerado',
    ]
    list_editable = ['frequencia_pct', 'nota_final']
    list_filter = ['curso', 'status', 'tempo_docencia', 'certificado_gerado']
    search_fields = ['nome_completo', 'email', 'instituicao_ensino', 'cpf']
    readonly_fields = ['codigo_matricula', 'data_inscricao', 'data_pagamento', 'data_certificado']
    ordering = ['-data_inscricao']
    inlines = [PresencaFormacaoIAInline]
    actions = ['emitir_certificado_action']

    def codigo_curto(self, obj):
        return obj.codigo_curto()
    codigo_curto.short_description = 'Código'

    @admin.action(description='Emitir certificado e enviar por e-mail')
    def emitir_certificado_action(self, request, queryset):
        from .utils.certificado import gerar_certificado_pdf_formacao_ia
        from .utils.email_utils import enviar_certificado_email_formacao_ia

        emitidos, bloqueados = 0, 0
        for matricula in queryset:
            if matricula.status not in ('pago', 'certificado_emitido') or not matricula.apto_certificado():
                bloqueados += 1
                continue
            if not matricula.certificado_gerado:
                matricula.certificado_gerado = True
                matricula.status = 'certificado_emitido'
                matricula.data_certificado = timezone.now()
                matricula.save()
            try:
                pdf_bytes = gerar_certificado_pdf_formacao_ia(matricula)
                enviar_certificado_email_formacao_ia(matricula, pdf_bytes)
                emitidos += 1
            except Exception:
                bloqueados += 1

        if emitidos:
            self.message_user(request, f'{emitidos} certificado(s) emitido(s) e enviado(s) por e-mail.')
        if bloqueados:
            self.message_user(
                request,
                f'{bloqueados} matrícula(s) ignorada(s) — sem pagamento confirmado, '
                'ou sem frequência/nota mínima lançada.',
                level='WARNING',
            )

import uuid
from django.db import models
from datetime import date


class Inscricao(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('aguardando_pagamento', 'Aguardando Pagamento'),
        ('pago', 'Pago'),
        ('cancelado', 'Cancelado'),
        ('certificado_emitido', 'Certificado Emitido'),
    ]

    TURNO_CHOICES = [
        ('manha', 'Manhã (8h–12h)'),
        ('tarde', 'Tarde (13h–17h)'),
    ]

    NIVEL_CHOICES = [
        ('iniciante', 'Iniciante — nunca mexi com eletrônica'),
        ('basico', 'Básico — já vi alguma coisa'),
        ('intermediario', 'Intermediário — já programei um pouco'),
    ]

    # ─── Dados do aluno ───────────────────────────────────────────────────────
    nome_completo       = models.CharField('Nome completo', max_length=200)
    data_nascimento     = models.DateField('Data de nascimento')
    escola              = models.CharField('Escola', max_length=200)
    serie               = models.CharField('Série/Ano', max_length=50)
    nivel_experiencia   = models.CharField('Nível de experiência', max_length=20,
                                           choices=NIVEL_CHOICES)
    turno               = models.CharField('Turno', max_length=10, choices=TURNO_CHOICES)

    # ─── Dados do responsável ─────────────────────────────────────────────────
    nome_responsavel    = models.CharField('Nome do responsável', max_length=200)
    telefone            = models.CharField('Telefone / WhatsApp', max_length=20)
    email               = models.EmailField('E-mail do responsável')
    cpf_responsavel     = models.CharField('CPF do responsável', max_length=14)

    # ─── Controle geral ───────────────────────────────────────────────────────
    status              = models.CharField(max_length=30, choices=STATUS_CHOICES,
                                           default='pendente')
    codigo_inscricao    = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    data_inscricao      = models.DateTimeField(auto_now_add=True)
    data_pagamento      = models.DateTimeField(null=True, blank=True)

    # ─── Pagamento ────────────────────────────────────────────────────────────
    valor_pago          = models.DecimalField(max_digits=8, decimal_places=2, default=1.00)
    id_transacao_pag    = models.CharField(max_length=200, blank=True)
    referencia_pag      = models.CharField(max_length=200, blank=True)

    # ─── Certificado ──────────────────────────────────────────────────────────
    certificado_gerado  = models.BooleanField(default=False)
    data_certificado    = models.DateTimeField(null=True, blank=True)

    # ─── Autorizações ─────────────────────────────────────────────────────────
    autoriza_imagem     = models.BooleanField('Autoriza uso de imagem', default=False)
    aceita_termos       = models.BooleanField('Aceita os termos', default=False)

    class Meta:
        ordering = ['-data_inscricao']
        verbose_name = 'Inscrição'
        verbose_name_plural = 'Inscrições'

    def __str__(self):
        return f"{self.nome_completo} — {self.get_status_display()}"

    def idade(self):
        hoje = date.today()
        return hoje.year - self.data_nascimento.year - (
            (hoje.month, hoje.day) < (self.data_nascimento.month, self.data_nascimento.day)
        )

    def codigo_curto(self):
        return str(self.codigo_inscricao)[:8].upper()

    def telefone_formatado(self):
        t = ''.join(c for c in self.telefone if c.isdigit())
        if len(t) == 11:
            return f'({t[:2]}) {t[2:7]}-{t[7:]}'
        if len(t) == 10:
            return f'({t[:2]}) {t[2:6]}-{t[6:]}'
        return self.telefone

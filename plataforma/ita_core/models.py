from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class PlanoEscola(models.Model):
    PLANOS = [
        ('trial', 'Trial (7 dias)'),
        ('professor', 'Professor — R$29/mês'),
        ('escola', 'Escola — R$99/mês'),
    ]
    STATUS = [
        ('trial', 'Trial'),
        ('ativo', 'Ativo'),
        ('inadimplente', 'Inadimplente'),
        ('cancelado', 'Cancelado'),
        ('bloqueado', 'Bloqueado'),
    ]

    tenant = models.OneToOneField(
        'gamificaedu_core.Tenant',
        on_delete=models.CASCADE,
        related_name='plano_escola',
    )
    plano = models.CharField(max_length=20, choices=PLANOS, default='trial')
    inicio = models.DateField(default=timezone.now)
    vencimento = models.DateField()
    valor_mensal = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='trial')
    pagseguro_code = models.CharField(max_length=100, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plano da Escola'
        verbose_name_plural = 'Planos das Escolas'

    def __str__(self):
        return f'{self.tenant.nome} — {self.get_plano_display()}'

    @property
    def modulos_liberados(self):
        base = ['itagame', 'corretor', 'repositorio', 'configuracoes']
        if self.plano == 'escola':
            base += ['relatorios', 'gestao_professores']
        return base

    @property
    def dias_restantes(self):
        delta = self.vencimento - timezone.now().date()
        return max(0, delta.days)

    @property
    def ativo(self):
        return self.status in ('trial', 'ativo') and self.dias_restantes > 0

    def save(self, *args, **kwargs):
        if not self.pk and not self.vencimento:
            dias = 7 if self.plano == 'trial' else 30
            self.vencimento = timezone.now().date() + timedelta(days=dias)
        super().save(*args, **kwargs)


class SessaoSSO(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessoes_sso',
    )
    token = models.CharField(max_length=600, unique=True, db_index=True)
    criada_em = models.DateTimeField(auto_now_add=True)
    expira_em = models.DateTimeField()
    ip_origem = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    ativa = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Sessão SSO'
        verbose_name_plural = 'Sessões SSO'
        ordering = ['-criada_em']

    def __str__(self):
        return f'SSO {self.usuario.email} — {self.criada_em:%d/%m/%Y %H:%M}'

    @property
    def expirada(self):
        return timezone.now() > self.expira_em

    def invalidar(self):
        self.ativa = False
        self.save(update_fields=['ativa'])


class LogAcesso(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_acesso',
    )
    modulo = models.CharField(max_length=50)
    acao = models.CharField(max_length=200)
    ip = models.GenericIPAddressField(null=True, blank=True)
    momento = models.DateTimeField(auto_now_add=True)
    detalhes = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Log de Acesso'
        verbose_name_plural = 'Logs de Acesso'
        ordering = ['-momento']

    def __str__(self):
        email = self.usuario.email if self.usuario else 'anônimo'
        return f'{email} → {self.modulo}/{self.acao} em {self.momento:%d/%m %H:%M}'

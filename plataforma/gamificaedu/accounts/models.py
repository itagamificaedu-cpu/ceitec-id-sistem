from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import uuid

class Professor(AbstractUser):
    # TIPOS DE USUÁRIO (SaaS)
    TYPE_ADMIN = 'admin'      # Super usuário do sistema
    TYPE_SCHOOL = 'school'    # Gestor da escola
    TYPE_PROFESSOR = 'prof'   # Professor
    
    TYPE_CHOICES = [
        (TYPE_ADMIN, 'Administrador Geral'),
        (TYPE_SCHOOL, 'Gestor Escolar'),
        (TYPE_PROFESSOR, 'Professor'),
    ]
    
    type_user = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_PROFESSOR)
    
    tenant = models.ForeignKey('gamificaedu_core.Tenant', on_delete=models.CASCADE, related_name='professores')

    # PLANOS
    PLANO_GRATUITO = 'gratuito'
    PLANO_EDUCADOR = 'educador'
    PLANO_COLABORADOR = 'colaborador'
    PLANO_CHOICES = [
        (PLANO_GRATUITO, 'Gratuito'),
        (PLANO_EDUCADOR, 'Educador'),
        (PLANO_COLABORADOR, 'Colaborador'),
    ]

    # STATUS DE APROVAÇÃO
    STATUS_PENDENTE = 'pendente'
    STATUS_APROVADO = 'aprovado'
    STATUS_REJEITADO = 'rejeitado'
    STATUS_CHOICES = [
        (STATUS_PENDENTE, 'Pendente'),
        (STATUS_APROVADO, 'Aprovado'),
        (STATUS_REJEITADO, 'Rejeitado'),
    ]

    # DADOS PROFISSIONAIS
    escola = models.CharField(max_length=200, blank=True)
    disciplina = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    telefone = models.CharField(max_length=20, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=2, blank=True)

    # PLANO E ACESSO
    plano = models.CharField(max_length=20, choices=PLANO_CHOICES, default=PLANO_GRATUITO)
    plano_expira_em = models.DateTimeField(null=True, blank=True)

    # APROVAÇÃO PELO ADMIN
    status_aprovacao = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDENTE)
    aprovado_por = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='aprovados'
    )
    aprovado_em = models.DateTimeField(null=True, blank=True)
    motivo_rejeicao = models.TextField(blank=True)

    # CONFIRMAÇÃO DE EMAIL
    email_confirmado = models.BooleanField(default=False)
    token_confirmacao_email = models.UUIDField(default=uuid.uuid4, editable=False)
    token_expira_em = models.DateTimeField(null=True, blank=True)

    # SEGURANÇA
    tentativas_login = models.IntegerField(default=0)
    bloqueado_ate = models.DateTimeField(null=True, blank=True)
    ultimo_login_ip = models.GenericIPAddressField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True, null=True, blank=True)

    # LOGIN por email
    email = models.EmailField(unique=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        verbose_name = 'Professor'
        verbose_name_plural = 'Professores'

    def __str__(self):
        return self.get_full_name() or self.email

    # PERMISSÕES DE ACESSO
    @property
    def pode_acessar(self):
        return self.email_confirmado and self.status_aprovacao == self.STATUS_APROVADO and self.is_active

    @property
    def plano_ativo(self):
        if self.plano == self.PLANO_GRATUITO:
            return True
        if self.plano_expira_em and self.plano_expira_em > timezone.now():
            return True
        return False

    @property
    def pode_corrigir_ilimitado(self):
        return self.plano in [self.PLANO_EDUCADOR, self.PLANO_COLABORADOR] and self.plano_ativo

    @property
    def pode_publicar(self):
        return self.plano == self.PLANO_COLABORADOR and self.plano_ativo

    @property
    def esta_bloqueado(self):
        if self.bloqueado_ate and self.bloqueado_ate > timezone.now():
            return True
        return False

    def registrar_tentativa_login(self, sucesso=False):
        if sucesso:
            self.tentativas_login = 0
            self.bloqueado_ate = None
        else:
            self.tentativas_login += 1
            if self.tentativas_login >= 5:
                self.bloqueado_ate = timezone.now() + timezone.timedelta(minutes=30)
        self.save(update_fields=['tentativas_login', 'bloqueado_ate'])

    def aprovar(self, admin_user):
        self.status_aprovacao = self.STATUS_APROVADO
        self.aprovado_por = admin_user
        self.aprovado_em = timezone.now()
        self.is_active = True
        self.save(update_fields=['status_aprovacao', 'aprovado_por', 'aprovado_em', 'is_active'])

    def rejeitar(self, motivo=''):
        self.status_aprovacao = self.STATUS_REJEITADO
        self.motivo_rejeicao = motivo
        self.is_active = False
        self.save(update_fields=['status_aprovacao', 'motivo_rejeicao', 'is_active'])

    def gerar_token_email(self):
        self.token_confirmacao_email = uuid.uuid4()
        self.token_expira_em = timezone.now() + timezone.timedelta(hours=24)
        self.save(update_fields=['token_confirmacao_email', 'token_expira_em'])
        return self.token_confirmacao_email

    @property
    def token_email_valido(self):
        if self.token_expira_em and self.token_expira_em > timezone.now():
            return True
        return False

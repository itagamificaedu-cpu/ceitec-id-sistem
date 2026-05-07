from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

# Mixin para Isolamento de Tenant
class TenantManager(models.Manager):
    def get_queryset(self):
        from .middleware import get_current_tenant
        tenant = get_current_tenant()
        if tenant:
            return super().get_queryset().filter(tenant=tenant)
        return super().get_queryset()

class TenantMixin(models.Model):
    tenant = models.ForeignKey('gamificaedu_core.Tenant', on_delete=models.CASCADE)
    
    objects = TenantManager()
    unfiltered_objects = models.Manager() # Para quando precisar de todos os dados

    class Meta:
        abstract = True

class Tenant(models.Model):
    nome = models.CharField(max_length=200)
    dominio = models.CharField(max_length=200, unique=True, blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

class Assinatura(TenantMixin):
    TIPO_PLANO = (
        ('gratuito', 'Gratuito'),
        ('educador', 'Educador (R$ 19/mês)'),
        ('colaborador', 'Colaborador (R$ 39/mês)'),
    )

    # <-- Usando a referência oficial do seu usuário customizado
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assinatura')
    plano = models.CharField(max_length=20, choices=TIPO_PLANO, default='gratuito')
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Usamos getattr para evitar erros caso o username não exista no seu modelo customizado
        nome = getattr(self.usuario, 'username', self.usuario.email)
        return f"{nome} - Plano: {self.get_plano_display()}"

# Automação: Cria o plano gratuito assim que o professor se cadastra
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def criar_assinatura_automatica(sender, instance, created, **kwargs):
    if created and hasattr(instance, 'tenant'):
        Assinatura.objects.create(usuario=instance, tenant=instance.tenant)
class LeadProfessor(TenantMixin):
    nome = models.CharField(max_length=100)
    whatsapp = models.CharField(max_length=20)
    disciplina = models.CharField(max_length=100)
    tema = models.CharField(max_length=200)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} - {self.whatsapp}"

from django.db import models
from django.conf import settings
from gamificaedu.core.models import TenantMixin

class GamificacaoPerfil(TenantMixin):
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='gamificacao')
    pontos = models.IntegerField(default=0)
    nivel = models.IntegerField(default=1)
    xp = models.IntegerField(default=0)
    streak = models.IntegerField(default=0) # Foguinhos estilo Duolingo
    ultima_atividade = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.usuario.email} - Nível {self.nivel}"

class Conquista(TenantMixin):
    titulo = models.CharField(max_length=100)
    descricao = models.TextField()
    icone = models.CharField(max_length=50, default='fa-medal')
    pontos_necessarios = models.IntegerField(default=0)
    
    def __str__(self):
        return self.titulo

class ConquistaUsuario(TenantMixin):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    conquista = models.ForeignKey(Conquista, on_delete=models.CASCADE)
    conquistada_em = models.DateTimeField(auto_now_add=True)

class Missao(TenantMixin):
    titulo = models.CharField(max_length=200)
    objetivo = models.TextField()
    recompensa_xp = models.IntegerField(default=10)
    ativa = models.BooleanField(default=True)
    
    def __str__(self):
        return self.titulo

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def criar_perfil_gamificado(sender, instance, created, **kwargs):
    if created:
        from gamificaedu.core.models import Tenant
        tenant = getattr(instance, 'tenant', None)
        if not tenant:
            # Busca o primeiro tenant disponível como fallback
            tenant = Tenant.objects.first()
            
        GamificacaoPerfil.objects.create(
            usuario=instance, 
            tenant=tenant
        )

def adicionar_xp(usuario, quantidade):
    perfil, _ = GamificacaoPerfil.objects.get_or_create(usuario=usuario, defaults={'tenant': getattr(usuario, 'tenant', None)})
    perfil.xp += quantidade
    # Lógica simples de nível
    novo_nivel = (perfil.xp // 100) + 1
    if novo_nivel > perfil.nivel:
        perfil.nivel = novo_nivel
    perfil.save()

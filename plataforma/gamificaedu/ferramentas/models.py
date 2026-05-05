from django.db import models
from django.conf import settings
from gamificaedu.core.models import TenantMixin

class Ferramenta(TenantMixin):
    CATEGORIAS = [
        ('gamificacao', 'Gamificação'),
        ('qrcode', 'QR Code'),
        ('avaliacao', 'Avaliação'),
        ('recurso', 'Recurso'),
    ]
    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    categoria = models.CharField(max_length=50, choices=CATEGORIAS)
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    criado_em = models.DateTimeField(auto_now_add=True)
    ativo = models.BooleanField(default=True)

    arquivo_pdf = models.FileField(upload_to='repositorio/pdfs/', null=True, blank=True, verbose_name='Arquivo PDF')

    def __str__(self):
        return self.titulo

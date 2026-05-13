from django.db import models
from django.conf import settings


class MonitoramentoFoco(models.Model):
    """
    Registra cada evento de foco/desfoco do aluno durante uma avaliação.
    Um registro = um evento. O total de saídas é contado pela view.
    """

    TIPOS_EVENTO = [
        ('blur',               'Saída de janela (blur)'),
        ('visibility_hidden',  'Aba oculta (visibility hidden)'),
        ('foco_retornado',     'Foco retornado'),
    ]

    # Aluno autenticado via SSO/link mágico
    aluno = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='registros_foco',
        verbose_name='Aluno',
    )

    # ID único gerado no navegador com crypto.randomUUID()
    sessao_id = models.CharField(
        max_length=100,
        verbose_name='ID da Sessão',
    )

    # ID da prova (quiz.pk para ItagGame | avaliacao.id para Corretor)
    prova_id = models.CharField(
        max_length=100,
        verbose_name='ID da Prova',
    )

    # Tipo do evento detectado
    tipo_evento = models.CharField(
        max_length=30,
        choices=TIPOS_EVENTO,
        verbose_name='Tipo de Evento',
    )

    # Timestamp registrado pelo servidor (automático)
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Timestamp do Servidor',
    )

    # Timestamp enviado pelo navegador do aluno
    timestamp_cliente = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Timestamp do Cliente',
    )

    # Total acumulado de saídas nessa sessão até este registro
    total_saidas = models.IntegerField(
        default=0,
        verbose_name='Total de Saídas na Sessão',
    )

    class Meta:
        verbose_name = 'Registro de Foco'
        verbose_name_plural = 'Registros de Foco'
        ordering = ['timestamp']

    def __str__(self):
        ts = self.timestamp.strftime('%d/%m/%Y %H:%M:%S') if self.timestamp else '—'
        return f"{self.aluno} | {self.get_tipo_evento_display()} | {ts}"

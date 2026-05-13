import hashlib

from django.conf import settings
from django.db import models
from django.utils import timezone

from gamificaedu.core.models import TenantMixin


class Quiz(TenantMixin):
    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    professor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quizzes_criados'
    )
    tempo_por_questao = models.IntegerField(default=30, help_text='Segundos por questão')
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo

    @property
    def total_questoes(self):
        return self.questoes.count()


class Questao(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questoes')
    texto = models.TextField()
    ordem = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordem']

    def __str__(self):
        return f'{self.quiz.titulo} — Q{self.ordem + 1}'

    @property
    def alternativa_correta(self):
        return self.alternativas.filter(correta=True).first()


class Alternativa(models.Model):
    questao = models.ForeignKey(Questao, on_delete=models.CASCADE, related_name='alternativas')
    texto = models.CharField(max_length=500)
    correta = models.BooleanField(default=False)

    def __str__(self):
        return f'{"✓" if self.correta else "✗"} {self.texto[:60]}'


class ResultadoQuiz(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resultados_quiz'
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='resultados')
    acertos = models.IntegerField(default=0)
    total = models.IntegerField(default=0)
    concluido_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-concluido_em']

    @property
    def percentual(self):
        if self.total == 0:
            return 0
        return round((self.acertos / self.total) * 100)

    @property
    def erros(self):
        return self.total - self.acertos


class RespostaUsuario(models.Model):
    resultado = models.ForeignKey(ResultadoQuiz, on_delete=models.CASCADE, related_name='respostas')
    questao = models.ForeignKey(Questao, on_delete=models.CASCADE)
    alternativa_escolhida = models.ForeignKey(
        Alternativa, on_delete=models.SET_NULL, null=True, blank=True
    )
    correta = models.BooleanField(default=False)


# ══════════════════════════════════════════════════════════════════
# MODELOS DE SEGURANÇA — Verificação de Identidade nas Avaliações
# ══════════════════════════════════════════════════════════════════

class AlunoPin(models.Model):
    """
    Armazena o PIN de segurança de um aluno para confirmar identidade
    antes de iniciar um quiz/avaliação no ItagGame.

    O PIN nunca é salvo em texto — apenas o hash SHA-256.
    Após 3 tentativas erradas, o acesso fica bloqueado por 10 minutos.
    """
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pin_seguranca',
        verbose_name='Usuário',
    )
    pin_hash = models.CharField(
        max_length=64,
        verbose_name='PIN (hash SHA-256)',
    )
    tentativas_falhas = models.IntegerField(
        default=0,
        verbose_name='Tentativas Falhas',
    )
    bloqueado_ate = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Bloqueado Até',
    )
    criado_em  = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'PIN do Aluno'
        verbose_name_plural = 'PINs dos Alunos'

    def __str__(self):
        return f'PIN de {self.usuario}'

    # ── Helpers ───────────────────────────────────────────────────

    @staticmethod
    def gerar_hash(pin_texto):
        """Retorna o hash SHA-256 do PIN em texto puro."""
        return hashlib.sha256(pin_texto.strip().encode()).hexdigest()

    def verificar(self, pin_texto):
        """Retorna True se o PIN fornecido corresponde ao hash salvo."""
        return self.pin_hash == self.gerar_hash(pin_texto)

    @property
    def esta_bloqueado(self):
        """True enquanto o bloqueio por tentativas erradas estiver ativo."""
        return bool(self.bloqueado_ate and self.bloqueado_ate > timezone.now())

    @property
    def tentativas_restantes(self):
        """Quantas tentativas ainda restam antes do bloqueio."""
        return max(0, 3 - self.tentativas_falhas)

    def registrar_tentativa_falha(self, quiz):
        """
        Incrementa o contador de falhas.
        Bloqueia por 10 minutos após a 3ª tentativa errada
        e registra uma TentativaSuspeita no banco.
        """
        self.tentativas_falhas += 1
        if self.tentativas_falhas >= 3:
            self.bloqueado_ate = timezone.now() + timezone.timedelta(minutes=10)
            TentativaSuspeita.objects.create(
                aluno_tentado=str(self.usuario.email),
                quiz=quiz,
                motivo=f'PIN incorreto — {self.tentativas_falhas}ª tentativa (bloqueio ativado)',
            )
        self.save(update_fields=['tentativas_falhas', 'bloqueado_ate'])

    def registrar_sucesso(self):
        """Reseta o contador após um PIN correto."""
        self.tentativas_falhas = 0
        self.bloqueado_ate = None
        self.save(update_fields=['tentativas_falhas', 'bloqueado_ate'])


class RegistroAcessoProva(models.Model):
    """
    Log completo de todos os acessos autenticados a quizzes/avaliações.
    Registra o método usado (SSO ou PIN), IP e user-agent para auditoria.
    """
    METODOS = [
        ('sso', 'CEITEC ID (SSO)'),
        ('pin', 'PIN de Segurança'),
    ]

    aluno = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='acessos_quizzes',
        verbose_name='Aluno',
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='registros_acesso',
        verbose_name='Quiz',
    )
    ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Endereço IP',
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name='User Agent',
    )
    metodo_autenticacao = models.CharField(
        max_length=10,
        choices=METODOS,
        default='sso',
        verbose_name='Método de Autenticação',
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data/Hora do Acesso',
    )

    class Meta:
        verbose_name = 'Registro de Acesso ao Quiz'
        verbose_name_plural = 'Registros de Acesso aos Quizzes'
        ordering = ['-timestamp']

    def __str__(self):
        ts = self.timestamp.strftime('%d/%m/%Y %H:%M') if self.timestamp else '—'
        return f'{self.aluno} → {self.quiz} [{self.metodo_autenticacao}] {ts}'


class TentativaSuspeita(models.Model):
    """
    Registra tentativas de acesso com PIN incorreto.
    Útil para auditoria e detecção de tentativas de burlar a autenticação.
    """
    aluno_tentado = models.CharField(
        max_length=200,
        verbose_name='Identificação Tentada',
        help_text='Email ou nome do aluno que tentou o acesso',
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='tentativas_suspeitas',
        verbose_name='Quiz',
    )
    ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Endereço IP',
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data/Hora',
    )
    motivo = models.CharField(
        max_length=255,
        verbose_name='Motivo',
        help_text='Ex: "PIN incorreto (3ª tentativa)", "Acesso sem autorização"',
    )

    class Meta:
        verbose_name = 'Tentativa Suspeita'
        verbose_name_plural = 'Tentativas Suspeitas'
        ordering = ['-timestamp']

    def __str__(self):
        ts = self.timestamp.strftime('%d/%m/%Y %H:%M') if self.timestamp else '—'
        return f'{self.aluno_tentado} → {self.quiz} | {self.motivo} | {ts}'

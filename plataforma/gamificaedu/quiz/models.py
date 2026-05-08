from django.db import models
from django.conf import settings
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

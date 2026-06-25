import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


# Usuario removido — sistema unificado usa accounts.Professor como AUTH_USER_MODEL


class AlunoITA(models.Model):
    """Leitura direta da tabela 'alunos' do sistema Node.js (mesmo banco Neon)."""
    codigo = models.CharField(max_length=20)
    nome = models.CharField(max_length=200)
    turma = models.CharField(max_length=100)
    turma_id = models.IntegerField(null=True, blank=True)
    curso = models.CharField(max_length=200, blank=True)
    ativo = models.IntegerField(default=1)
    escola_id = models.IntegerField(null=True, blank=True)
    data_matricula = models.DateField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'alunos'
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.turma})"


class Avaliacao(models.Model):
    STATUS_CHOICES = [
        ('rascunho', 'Rascunho'),
        ('publicada', 'Publicada'),
        ('encerrada', 'Encerrada'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo = models.CharField(max_length=200)
    instituicao = models.CharField(max_length=200)
    professor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='%(class)s_professor')
    disciplina = models.CharField(max_length=100)
    serie = models.CharField(max_length=50)
    turma = models.CharField(max_length=50)
    arquivo_prova = models.FileField(upload_to='provas/', blank=True, null=True, help_text="PDF da prova")
    data_aplicacao = models.DateField(null=True, blank=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    numero_questoes = models.PositiveIntegerField(default=10)
    alternativas_por_questao = models.PositiveIntegerField(default=5)
    gabarito = models.JSONField(default=dict, help_text="Dicionário com número da questão e alternativa correta")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='rascunho')
    is_manual = models.BooleanField(default=False, help_text="Se a prova foi criada manualmente no sistema")
    is_online = models.BooleanField(default=False, help_text="Se a prova pode ser respondida online pelos alunos")
    
    class Meta:
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
        ordering = ['-data_criacao']
        indexes = [
            models.Index(fields=['professor', 'status']),
            models.Index(fields=['data_criacao']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.disciplina}"
    
    def get_gabarito_display(self):
        return ', '.join([f"Q{k}: {v}" for k, v in sorted(self.gabarito.items())])
    
    def total_correcoes(self):
        return self.resultados.count()
    
    def media_notas(self):
        resultados = self.resultados.all()
        if resultados.exists():
            return resultados.aggregate(models.Avg('nota'))['nota__avg']
        return 0





class Resultado(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE, related_name='resultados')
    aluno_nome = models.CharField(max_length=200)
    turma = models.CharField(max_length=50)
    respostas = models.JSONField(default=dict, help_text="Respostas do aluno")
    nota = models.FloatField(null=True, blank=True)
    acertos = models.PositiveIntegerField(default=0)
    erros = models.PositiveIntegerField(default=0)
    MODO_CHOICES = [
        ('scanner', 'Scanner/QR Code'),
        ('online', 'Resposta Online'),
    ]
    modo = models.CharField(max_length=20, choices=MODO_CHOICES, default='scanner')
    data_correcao = models.DateTimeField(auto_now_add=True)
    imagem_original = models.ImageField(upload_to='correcoes/', blank=True, null=True)
    observacoes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Resultado'
        verbose_name_plural = 'Resultados'
        ordering = ['-data_correcao']
        indexes = [
            models.Index(fields=['avaliacao', 'data_correcao']),
            models.Index(fields=['aluno_nome', 'turma']),
            models.Index(fields=['nota']),
        ]
    
    def __str__(self):
        return f"{self.aluno_nome} - {self.avaliacao.titulo} - Nota: {self.nota}"
    
    def calcular_nota(self):
        if not self.avaliacao.gabarito:
            return 0
        
        acertos = 0
        erros = 0
        total = len(self.avaliacao.gabarito)
        
        for questao, alternativa_correta in self.avaliacao.gabarito.items():
            resp_aluno = self.respostas.get(str(questao))
            if resp_aluno == alternativa_correta:
                acertos += 1
            else:
                erros += 1
        
        self.acertos = acertos
        self.erros = erros
        self.nota = round((acertos / total) * 10, 2) if total > 0 else 0
        return self.nota


class Estatisticas(models.Model):
    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE, related_name='estatisticas')
    total_alunos = models.PositiveIntegerField(default=0)
    media_notas = models.FloatField(default=0)
    maior_nota = models.FloatField(default=0)
    menor_nota = models.FloatField(default=0)
    mediana_notas = models.FloatField(default=0)
    desvio_padrao = models.FloatField(default=0)
    taxa_aprovacao = models.FloatField(default=0)
    questoes_estatisticas = models.JSONField(default=dict)
    data_calculo = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Estatística'
        verbose_name_plural = 'Estatísticas'
    
    def __str__(self):
        return f"Estatísticas - {self.avaliacao.titulo}"


class Aluno(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=200)
    turma = models.CharField(max_length=50)
    professor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='alunos_corretor')
    data_cadastro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Aluno'
        verbose_name_plural = 'Alunos'
        unique_together = ['nome', 'turma', 'professor']
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.turma})"


class TokenQR(models.Model):
    TIPO_CHOICES = [
        ('prova', 'Token da Prova (acesso geral)'),
        ('aluno', 'Token Individual por Aluno'),
    ]
    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('expirado', 'Expirado'),
        ('revogado', 'Revogado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE, related_name='tokens_qr')
    aluno = models.ForeignKey(Aluno, on_delete=models.SET_NULL, null=True, blank=True, related_name='tokens_qr')
    token = models.CharField(max_length=128, unique=True, db_index=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='prova')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ativo')
    criado_em = models.DateTimeField(auto_now_add=True)
    expira_em = models.DateTimeField()
    usado_em = models.DateTimeField(null=True, blank=True)
    max_usos = models.PositiveIntegerField(default=1, help_text="Número máximo de usos (0 = ilimitado)")
    usos_count = models.PositiveIntegerField(default=0)
    ip_ultimo_uso = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = 'Token QR'
        verbose_name_plural = 'Tokens QR'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['token', 'status']),
            models.Index(fields=['avaliacao', 'status']),
        ]

    def __str__(self):
        alvo = f" - {self.aluno.nome}" if self.aluno else " (Geral)"
        return f"QR Token: {self.avaliacao.titulo}{alvo}"

    def esta_valido(self):
        if self.status != 'ativo':
            return False
        if self.expira_em < timezone.now():
            return False
        if self.max_usos > 0 and self.usos_count >= self.max_usos:
            return False
        return True

    def registrar_uso(self, ip=None):
        self.usos_count += 1
        self.ip_ultimo_uso = ip
        if self.max_usos > 0 and self.usos_count >= self.max_usos:
            self.status = 'expirado'
        self.usado_em = timezone.now()
        self.save()


class Tentativa(models.Model):
    STATUS_CHOICES = [
        ('conectado', 'Conectado'),
        ('iniciado', 'Iniciado'),
        ('em_andamento', 'Em Andamento'),
        ('finalizado', 'Finalizado'),
        ('desconectado', 'Desconectado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE, related_name='tentativas')
    aluno_nome = models.CharField(max_length=200)
    aluno = models.ForeignKey(Aluno, on_delete=models.SET_NULL, null=True, blank=True, related_name='tentativas')
    token_qr = models.ForeignKey(TokenQR, on_delete=models.SET_NULL, null=True, blank=True, related_name='tentativas')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='conectado')
    iniciado_em = models.DateTimeField(null=True, blank=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)
    ultima_atividade = models.DateTimeField(auto_now=True)
    ip_acesso = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Tentativa'
        verbose_name_plural = 'Tentativas'
        ordering = ['-iniciado_em']
        indexes = [
            models.Index(fields=['avaliacao', 'status']),
            models.Index(fields=['ultima_atividade']),
        ]

    def __str__(self):
        return f"{self.aluno_nome} - {self.avaliacao.titulo} ({self.get_status_display()})"

    def duracao_segundos(self):
        if self.iniciado_em and self.finalizado_em:
            return (self.finalizado_em - self.iniciado_em).total_seconds()
        elif self.iniciado_em:
            return (timezone.now() - self.iniciado_em).total_seconds()
        return 0

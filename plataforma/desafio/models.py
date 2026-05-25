"""
Modelos do Dia do Desafio — CEITEC Itapipoca
Evento esportivo: Ciclismo, Corrida e Trilha
"""
from django.db import models


class CategoriaDesafio(models.Model):
    """Categoria do desafio: Ciclismo, Corrida ou Trilha."""
    nome = models.CharField(max_length=100, verbose_name='Nome')
    icone = models.CharField(max_length=50, default='🚴', verbose_name='Ícone')
    ativo = models.BooleanField(default=True, verbose_name='Ativo')

    class Meta:
        verbose_name = 'Categoria do Desafio'
        verbose_name_plural = 'Categorias do Desafio'
        ordering = ['nome']

    def __str__(self):
        return f'{self.icone} {self.nome}'


class AtividadeDesafio(models.Model):
    """Atividade dentro de uma categoria: ex. Ciclismo 5km, Corrida 10km."""
    categoria = models.ForeignKey(
        CategoriaDesafio,
        on_delete=models.CASCADE,
        related_name='atividades',
        verbose_name='Categoria',
    )
    nome = models.CharField(max_length=200, verbose_name='Nome da atividade')
    descricao = models.TextField(blank=True, verbose_name='Descrição')

    class Meta:
        verbose_name = 'Atividade do Desafio'
        verbose_name_plural = 'Atividades do Desafio'
        ordering = ['categoria__nome', 'nome']

    def __str__(self):
        return f'{self.categoria.nome} — {self.nome}'


class InscricaoDesafio(models.Model):
    """Inscrição de um participante (aluno ou comunidade) no Dia do Desafio."""

    TIPO_CHOICES = [
        ('aluno',      'Aluno'),
        ('comunidade', 'Comunidade'),
    ]

    # Identificação única da inscrição (gerada automaticamente)
    numero_inscricao = models.CharField(
        max_length=20, unique=True, editable=False, verbose_name='Número de inscrição'
    )
    tipo = models.CharField(
        max_length=20, choices=TIPO_CHOICES, verbose_name='Tipo de participante'
    )
    categoria = models.ForeignKey(
        CategoriaDesafio, on_delete=models.PROTECT, verbose_name='Categoria'
    )
    atividade = models.ForeignKey(
        AtividadeDesafio, on_delete=models.PROTECT, verbose_name='Atividade'
    )

    # Dados pessoais comuns
    nome_completo   = models.CharField(max_length=200, verbose_name='Nome completo')
    email           = models.EmailField(verbose_name='E-mail')
    telefone        = models.CharField(max_length=20, verbose_name='Telefone')
    data_nascimento = models.DateField(verbose_name='Data de nascimento')

    # Campos exclusivos para alunos
    escola   = models.CharField(max_length=200, blank=True, verbose_name='Escola')
    turma    = models.CharField(max_length=50,  blank=True, verbose_name='Turma')
    matricula = models.CharField(max_length=50, blank=True, verbose_name='Matrícula')

    # Campos exclusivos para comunidade
    cpf    = models.CharField(max_length=14,  blank=True, verbose_name='CPF')
    cidade = models.CharField(max_length=100, blank=True, verbose_name='Cidade')

    criado_em = models.DateTimeField(auto_now_add=True, verbose_name='Inscrito em')

    class Meta:
        verbose_name = 'Inscrição no Desafio'
        verbose_name_plural = 'Inscrições no Desafio'
        ordering = ['-criado_em']

    def save(self, *args, **kwargs):
        # Gera o número de inscrição automaticamente no primeiro salvamento
        if not self.numero_inscricao:
            prefixo = 'ALU' if self.tipo == 'aluno' else 'COM'
            seq = InscricaoDesafio.objects.count() + 1
            self.numero_inscricao = f'DD-{prefixo}-{seq:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.numero_inscricao} — {self.nome_completo}'

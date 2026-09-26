import uuid
from django.db import models
from datetime import date


class Inscricao(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('aguardando_pagamento', 'Aguardando Pagamento'),
        ('pago', 'Pago'),
        ('cancelado', 'Cancelado'),
        ('certificado_emitido', 'Certificado Emitido'),
    ]

    TURNO_CHOICES = [
        ('manha', 'Manhã (8h–12h)'),
        ('tarde', 'Tarde (13h–17h)'),
    ]

    NIVEL_CHOICES = [
        ('iniciante', 'Iniciante — nunca mexi com eletrônica'),
        ('basico', 'Básico — já vi alguma coisa'),
        ('intermediario', 'Intermediário — já programei um pouco'),
    ]

    # ─── Dados do aluno ───────────────────────────────────────────────────────
    nome_completo       = models.CharField('Nome completo', max_length=200)
    data_nascimento     = models.DateField('Data de nascimento')
    escola              = models.CharField('Escola', max_length=200)
    serie               = models.CharField('Série/Ano', max_length=50)
    nivel_experiencia   = models.CharField('Nível de experiência', max_length=20,
                                           choices=NIVEL_CHOICES)
    turno               = models.CharField('Turno', max_length=10, choices=TURNO_CHOICES)

    # ─── Dados do responsável ─────────────────────────────────────────────────
    nome_responsavel    = models.CharField('Nome do responsável', max_length=200)
    telefone            = models.CharField('Telefone / WhatsApp', max_length=20)
    email               = models.EmailField('E-mail do responsável')
    cpf_responsavel     = models.CharField('CPF do responsável', max_length=14)

    # ─── Controle geral ───────────────────────────────────────────────────────
    status              = models.CharField(max_length=30, choices=STATUS_CHOICES,
                                           default='pendente')
    codigo_inscricao    = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    data_inscricao      = models.DateTimeField(auto_now_add=True)
    data_pagamento      = models.DateTimeField(null=True, blank=True)

    # ─── Pagamento ────────────────────────────────────────────────────────────
    valor_pago          = models.DecimalField(max_digits=8, decimal_places=2, default=99.90)
    id_transacao_pag    = models.CharField(max_length=200, blank=True)
    referencia_pag      = models.CharField(max_length=200, blank=True)

    # ─── Certificado ──────────────────────────────────────────────────────────
    certificado_gerado  = models.BooleanField(default=False)
    data_certificado    = models.DateTimeField(null=True, blank=True)

    # ─── Autorizações ─────────────────────────────────────────────────────────
    autoriza_imagem     = models.BooleanField('Autoriza uso de imagem', default=False)
    aceita_termos       = models.BooleanField('Aceita os termos', default=False)

    class Meta:
        ordering = ['-data_inscricao']
        verbose_name = 'Inscrição'
        verbose_name_plural = 'Inscrições'

    def __str__(self):
        return f"{self.nome_completo} — {self.get_status_display()}"

    def idade(self):
        hoje = date.today()
        return hoje.year - self.data_nascimento.year - (
            (hoje.month, hoje.day) < (self.data_nascimento.month, self.data_nascimento.day)
        )

    def codigo_curto(self):
        return str(self.codigo_inscricao)[:8].upper()

    def telefone_formatado(self):
        t = ''.join(c for c in self.telefone if c.isdigit())
        if len(t) == 11:
            return f'({t[:2]}) {t[2:7]}-{t[7:]}'
        if len(t) == 10:
            return f'({t[:2]}) {t[2:6]}-{t[6:]}'
        return self.telefone


class PresencaCursoFerias(models.Model):
    """Registro de presença diária de cada aluno no Curso de Férias Maker."""

    DIA_CHOICES = [(i, f'Dia {i}') for i in range(1, 6)]

    inscricao = models.ForeignKey(
        Inscricao, on_delete=models.CASCADE,
        related_name='presencas', verbose_name='Inscrição'
    )
    dia = models.IntegerField('Dia do curso', choices=DIA_CHOICES)
    presente = models.BooleanField('Presente', default=False)
    hora_chegada = models.TimeField('Hora de chegada', null=True, blank=True)
    observacao = models.CharField('Observação', max_length=300, blank=True)
    registrado_em = models.DateTimeField('Registrado em', auto_now_add=True)
    registrado_por = models.CharField('Registrado por', max_length=100, blank=True)

    class Meta:
        unique_together = ('inscricao', 'dia')
        ordering = ['dia', 'inscricao__nome_completo']
        verbose_name = 'Presença — Curso de Férias'
        verbose_name_plural = 'Presenças — Curso de Férias'

    def __str__(self):
        status = 'Presente' if self.presente else 'Ausente'
        return f'{self.inscricao.nome_completo} — Dia {self.dia} — {status}'


# ─────────────────────────────────────────────────────────────────────────────
# Formação em IA Aplicada à Educação (120h) — curso pago, turma fechada,
# separado do Curso de Férias. Modelos novos e paralelos: o Curso de Férias
# não tem tabela de curso/módulo/sessão nem nota, então não dá pra reaproveitar
# Inscricao/PresencaCursoFerias sem forçar campos que não fazem sentido pra
# público adulto/docente. Só o que já é genérico (UUID, fluxo Mercado Pago,
# geração de certificado) é reaproveitado nos utils, não nos models.
# ─────────────────────────────────────────────────────────────────────────────

class FormacaoIA(models.Model):
    """Uma edição/turma da Formação em Inteligência Artificial Aplicada à Educação."""

    nome = models.CharField(
        'Nome do curso', max_length=200,
        default='Formação em Inteligência Artificial Aplicada à Educação'
    )
    edicao = models.CharField('Edição', max_length=50, help_text='Ex.: 2026.2 (Nov–Dez/2026)')
    carga_horaria_total = models.PositiveIntegerField('Carga horária total (h)', default=120)
    carga_horaria_ead = models.PositiveIntegerField('Carga horária EAD (h)', default=96)
    carga_horaria_presencial = models.PositiveIntegerField('Carga horária presencial (h)', default=24)
    periodo_ead_descricao = models.CharField(
        'Período EAD', max_length=200, default='Novembro (trilha online)'
    )
    periodo_presencial_descricao = models.CharField(
        'Período presencial', max_length=200,
        default='Dezembro (imersão presencial + projeto final)'
    )
    local_presencial = models.CharField('Local da etapa presencial', max_length=200, default='Itapipoca, Ceará')
    valor_inscricao = models.DecimalField('Valor da inscrição', max_digits=8, decimal_places=2, default=99.90)
    vagas_total = models.PositiveIntegerField('Vagas totais', default=40)
    frequencia_minima_pct = models.PositiveIntegerField('Frequência mínima (%)', default=75)
    nota_minima = models.DecimalField('Nota mínima', max_digits=3, decimal_places=1, default=6.0)
    peso_prova_presencial_pct = models.PositiveIntegerField('Peso — prova/projeto presencial (%)', default=40)
    peso_atividades_modulo_pct = models.PositiveIntegerField('Peso — atividades por módulo (%)', default=20)
    peso_participacao_pct = models.PositiveIntegerField('Peso — participação (%)', default=10)
    peso_projeto_final_pct = models.PositiveIntegerField('Peso — projeto aplicado final (%)', default=30)
    certificacao_descricao = models.CharField(
        'Descrição da certificação', max_length=300,
        default='Certificado de Extensão/Aperfeiçoamento, mediante 75% de frequência '
                'e aproveitamento mínimo (nota final ≥ 6,0)'
    )
    ativa = models.BooleanField('Aceita novas inscrições', default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Formação em IA — Edição'
        verbose_name_plural = 'Formação em IA — Edições'

    def __str__(self):
        return f'{self.nome} — {self.edicao}'

    def vagas_usadas(self):
        return self.matriculas.filter(status__in=['pago', 'certificado_emitido']).count()

    def vagas_disponiveis(self):
        return max(self.vagas_total - self.vagas_usadas(), 0)


class ModuloFormacaoIA(models.Model):
    curso = models.ForeignKey(FormacaoIA, on_delete=models.CASCADE, related_name='modulos')
    numero = models.PositiveIntegerField('Número do módulo')
    titulo = models.CharField('Título', max_length=200)
    formato = models.CharField('Formato', max_length=200)
    carga_horaria = models.PositiveIntegerField('Carga horária (h)')
    fundamentacao_texto = models.TextField('Fundamentação teórica', blank=True)
    fundamentacao_referencias = models.JSONField('Referências', default=list, blank=True)

    class Meta:
        ordering = ['curso', 'numero']
        unique_together = ('curso', 'numero')
        verbose_name = 'Módulo — Formação em IA'
        verbose_name_plural = 'Módulos — Formação em IA'

    def __str__(self):
        return f'Módulo {self.numero} — {self.titulo}'


class SessaoFormacaoIA(models.Model):
    modulo = models.ForeignKey(ModuloFormacaoIA, on_delete=models.CASCADE, related_name='sessoes')
    codigo = models.CharField('Código', max_length=10)
    titulo = models.CharField('Título', max_length=250)
    carga_horaria = models.PositiveIntegerField('Carga horária (h)', default=4)
    objetivo = models.TextField('Objetivo', blank=True)
    conteudo = models.JSONField('Conteúdo', default=list, blank=True)
    metodologia = models.CharField('Metodologia', max_length=300, blank=True)
    exemplo_pratico = models.TextField('Exemplo prático', blank=True)
    recursos = models.JSONField('Recursos', default=list, blank=True)
    avaliacao_produto = models.CharField('Produto avaliativo', max_length=300, blank=True)
    referencias = models.JSONField('Referências', default=list, blank=True)

    class Meta:
        ordering = ['modulo', 'codigo']
        verbose_name = 'Sessão — Formação em IA'
        verbose_name_plural = 'Sessões — Formação em IA'

    def __str__(self):
        return f'{self.codigo} — {self.titulo}'


class MatriculaFormacaoIA(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('aguardando_pagamento', 'Aguardando Pagamento'),
        ('pago', 'Pago'),
        ('cancelado', 'Cancelado'),
        ('certificado_emitido', 'Certificado Emitido'),
    ]

    TEMPO_DOCENCIA_CHOICES = [
        ('menos_1', 'Menos de 1 ano'),
        ('1_3', 'De 1 a 3 anos'),
        ('4_10', 'De 4 a 10 anos'),
        ('mais_10', 'Mais de 10 anos'),
    ]

    curso = models.ForeignKey(FormacaoIA, on_delete=models.PROTECT, related_name='matriculas')

    # ─── Dados do professor ───────────────────────────────────────────────────
    nome_completo       = models.CharField('Nome completo', max_length=200)
    cpf                 = models.CharField('CPF', max_length=14)
    email               = models.EmailField('E-mail')
    telefone            = models.CharField('Telefone / WhatsApp', max_length=20)
    instituicao_ensino  = models.CharField('Instituição onde leciona', max_length=200)
    area_disciplina     = models.CharField('Área / disciplina que leciona', max_length=150)
    tempo_docencia      = models.CharField('Tempo de docência', max_length=20, choices=TEMPO_DOCENCIA_CHOICES)
    declara_atuacao_docente = models.BooleanField('Declara atuação na docência', default=False)

    # ─── Controle geral ───────────────────────────────────────────────────────
    status              = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pendente')
    codigo_matricula    = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    data_inscricao      = models.DateTimeField(auto_now_add=True)
    data_pagamento      = models.DateTimeField(null=True, blank=True)

    # ─── Pagamento ────────────────────────────────────────────────────────────
    valor_pago          = models.DecimalField(max_digits=8, decimal_places=2, default=99.90)
    id_transacao_pag    = models.CharField(max_length=200, blank=True)
    referencia_pag      = models.CharField(max_length=200, blank=True)

    # ─── Avaliação / conclusão ────────────────────────────────────────────────
    frequencia_pct        = models.PositiveIntegerField('Frequência (%)', null=True, blank=True)
    nota_final             = models.DecimalField('Nota final', max_digits=4, decimal_places=1, null=True, blank=True)
    projeto_final_titulo   = models.CharField('Título/link do projeto final', max_length=300, blank=True)
    observacoes_staff      = models.TextField('Observações internas', blank=True)

    # ─── Certificado ──────────────────────────────────────────────────────────
    certificado_gerado  = models.BooleanField(default=False)
    data_certificado    = models.DateTimeField(null=True, blank=True)

    # ─── Autorizações ─────────────────────────────────────────────────────────
    autoriza_imagem     = models.BooleanField('Autoriza uso de imagem', default=False)
    aceita_termos       = models.BooleanField('Aceita os termos', default=False)

    class Meta:
        ordering = ['-data_inscricao']
        verbose_name = 'Matrícula — Formação em IA'
        verbose_name_plural = 'Matrículas — Formação em IA'

    def __str__(self):
        return f'{self.nome_completo} — {self.get_status_display()}'

    def codigo_curto(self):
        return str(self.codigo_matricula)[:8].upper()

    def telefone_formatado(self):
        t = ''.join(c for c in self.telefone if c.isdigit())
        if len(t) == 11:
            return f'({t[:2]}) {t[2:7]}-{t[7:]}'
        if len(t) == 10:
            return f'({t[:2]}) {t[2:6]}-{t[6:]}'
        return self.telefone

    def apto_certificado(self):
        """Frequência e nota dentro do exigido pela edição do curso."""
        if self.frequencia_pct is None or self.nota_final is None:
            return False
        return (
            self.frequencia_pct >= self.curso.frequencia_minima_pct
            and self.nota_final >= self.curso.nota_minima
        )


class PresencaFormacaoIA(models.Model):
    """Presença dos dias presenciais (dezembro) da Formação em IA."""

    DIA_CHOICES = [
        (1, 'Dia 1 — Fundamentos de IA e Educação'),
        (2, 'Dia 2 — Robótica, Cultura Maker e IA na Prática'),
        (3, 'Dia 3 — Apresentação do Projeto Final'),
    ]

    matricula = models.ForeignKey(
        MatriculaFormacaoIA, on_delete=models.CASCADE,
        related_name='presencas', verbose_name='Matrícula'
    )
    dia = models.IntegerField('Dia do curso', choices=DIA_CHOICES)
    presente = models.BooleanField('Presente', default=False)
    hora_chegada = models.TimeField('Hora de chegada', null=True, blank=True)
    observacao = models.CharField('Observação', max_length=300, blank=True)
    registrado_em = models.DateTimeField('Registrado em', auto_now_add=True)
    registrado_por = models.CharField('Registrado por', max_length=100, blank=True)

    class Meta:
        unique_together = ('matricula', 'dia')
        ordering = ['dia', 'matricula__nome_completo']
        verbose_name = 'Presença — Formação em IA'
        verbose_name_plural = 'Presenças — Formação em IA'

    def __str__(self):
        status = 'Presente' if self.presente else 'Ausente'
        return f'{self.matricula.nome_completo} — Dia {self.dia} — {status}'

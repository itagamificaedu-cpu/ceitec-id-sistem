from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import PageBreak

OUTPUT = r"C:\Users\genez\CEITEC ID SYSTEM\Guia_Liga_Jovem_2026.pdf"

# ── Cores ──────────────────────────────────────────────────────
VERDE_ESCURO  = colors.HexColor('#064e3b')
VERDE_MED     = colors.HexColor('#065f46')
VERDE_CLARO   = colors.HexColor('#d1fae5')
DOURADO       = colors.HexColor('#d97706')
DOURADO_CLARO = colors.HexColor('#fef3c7')
DOURADO_BORDA = colors.HexColor('#f59e0b')
BRANCO        = colors.white
CINZA_TEXTO   = colors.HexColor('#374151')
CINZA_CLARO   = colors.HexColor('#f9fafb')
AZUL_INFO     = colors.HexColor('#1e40af')
AZUL_BG       = colors.HexColor('#eff6ff')
VERMELHO      = colors.HexColor('#991b1b')
AMARELO_AVISO = colors.HexColor('#fffbeb')

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=1.8*cm, rightMargin=1.8*cm,
    topMargin=1.5*cm, bottomMargin=1.5*cm,
)

story = []

# ── Estilos ─────────────────────────────────────────────────────
def estilo(nome, base='Normal', **kwargs):
    s = getSampleStyleSheet()
    b = s[base].clone(nome)
    for k, v in kwargs.items():
        setattr(b, k, v)
    return b

TITULO_CAPA    = estilo('TituloCapa',    'Normal', fontSize=26, fontName='Helvetica-Bold', textColor=BRANCO,      alignment=TA_CENTER, leading=32)
SUBTITULO_CAPA = estilo('SubtituloCapa', 'Normal', fontSize=13, fontName='Helvetica',      textColor=DOURADO_CLARO, alignment=TA_CENTER, leading=18)
SECAO          = estilo('Secao',         'Normal', fontSize=15, fontName='Helvetica-Bold', textColor=BRANCO,      alignment=TA_LEFT,   leading=20)
ITEM_TITULO    = estilo('ItemTitulo',    'Normal', fontSize=12, fontName='Helvetica-Bold', textColor=VERDE_ESCURO, alignment=TA_LEFT,  leading=16)
CORPO          = estilo('Corpo',         'Normal', fontSize=10, fontName='Helvetica',      textColor=CINZA_TEXTO,  alignment=TA_JUSTIFY, leading=15)
PASSO          = estilo('Passo',         'Normal', fontSize=10, fontName='Helvetica',      textColor=CINZA_TEXTO,  alignment=TA_LEFT,  leading=15, leftIndent=12)
AVISO          = estilo('Aviso',         'Normal', fontSize=9,  fontName='Helvetica-Bold', textColor=DOURADO,     alignment=TA_LEFT,   leading=14)
NOTA           = estilo('Nota',          'Normal', fontSize=8,  fontName='Helvetica',      textColor=AZUL_INFO,   alignment=TA_LEFT,   leading=12)
RODAPE         = estilo('Rodape',        'Normal', fontSize=8,  fontName='Helvetica',      textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)

# ════════════════════════════════════════════════════════════════
# CAPA
# ════════════════════════════════════════════════════════════════
def capa_header():
    return Table(
        [[Paragraph('<b>🏅  DESAFIO LIGA JOVEM 2026</b>', TITULO_CAPA)],
         [Paragraph('Guia Oficial de Uso da Plataforma', SUBTITULO_CAPA)],
         [Paragraph('ITA Tecnologia Educacional · CEITEC', SUBTITULO_CAPA)]],
        colWidths=[doc.width],
        style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), VERDE_ESCURO),
            ('ROUNDEDCORNERS', [10]),
            ('TOPPADDING',    (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LEFTPADDING',   (0,0), (-1,-1), 20),
            ('RIGHTPADDING',  (0,0), (-1,-1), 20),
        ])
    )

story.append(capa_header())
story.append(Spacer(1, 0.5*cm))

# Box de boas-vindas
intro_txt = (
    'Este guia foi criado especialmente para os <b>5 representantes do CEITEC</b> '
    'no Desafio Liga Jovem 2026. Aqui você aprende, passo a passo, como usar cada '
    'módulo liberado para o seu perfil. Leia com atenção e use a plataforma com '
    'responsabilidade!'
)
intro = Table(
    [[Paragraph(intro_txt, CORPO)]],
    colWidths=[doc.width],
    style=TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), DOURADO_CLARO),
        ('BOX', (0,0), (-1,-1), 1.2, DOURADO_BORDA),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ])
)
story.append(intro)
story.append(Spacer(1, 0.4*cm))

# Acesso ao sistema
acesso_data = [
    [Paragraph('<b>URL de acesso</b>', ITEM_TITULO), Paragraph('<b>itatecnologiaeducacional.tech/login</b>', ITEM_TITULO)],
    [Paragraph('E-mail de login', CORPO),  Paragraph('seu nome @ligajovem.ceitec', CORPO)],
    [Paragraph('Senha',           CORPO),  Paragraph('Numero do celular (so digitos, sem espaco ou traco)', CORPO)],
    [Paragraph('<b>Trocar senha</b>', AVISO), Paragraph('<b>NAO e permitido trocar a senha</b>', AVISO)],
]
acesso_tbl = Table(acesso_data, colWidths=[5.5*cm, doc.width - 5.5*cm])
acesso_tbl.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), VERDE_MED),
    ('TEXTCOLOR',  (0,0), (-1,0), BRANCO),
    ('BACKGROUND', (0,1), (-1,1), CINZA_CLARO),
    ('BACKGROUND', (0,2), (-1,2), BRANCO),
    ('BACKGROUND', (0,3), (-1,3), AMARELO_AVISO),
    ('BOX',    (0,0), (-1,-1), 1, VERDE_MED),
    ('GRID',   (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
    ('TOPPADDING',    (0,0), (-1,-1), 8),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('LEFTPADDING',   (0,0), (-1,-1), 10),
    ('RIGHTPADDING',  (0,0), (-1,-1), 10),
]))
story.append(acesso_tbl)
story.append(Spacer(1, 0.3*cm))

# Lista de representantes
story.append(Paragraph('👥  Os 5 Representantes', ITEM_TITULO))
story.append(Spacer(1, 0.15*cm))
rep_data = [
    [Paragraph('<b>Emoji</b>', CORPO), Paragraph('<b>Nome</b>', CORPO), Paragraph('<b>Turma</b>', CORPO), Paragraph('<b>E-mail de login</b>', CORPO)],
    ['🦁', 'Isaac Candido',  '9A', 'isaac@ligajovem.ceitec'],
    ['⚡', 'Thiago Gabriel', '9B', 'thiago@ligajovem.ceitec'],
    ['🌟', 'Julia Teodora',  '9B', 'julia@ligajovem.ceitec'],
    ['🔥', 'Ana Beatriz',    '9A', 'anabeatriz@ligajovem.ceitec'],
    ['🚀', 'Leonardo Caua',  '9A', 'leonardo@ligajovem.ceitec'],
]
rep_tbl = Table(rep_data, colWidths=[1.4*cm, 5*cm, 2*cm, doc.width-8.4*cm])
rep_tbl.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), VERDE_ESCURO),
    ('TEXTCOLOR',  (0,0), (-1,0), BRANCO),
    ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [CINZA_CLARO, BRANCO]),
    ('BOX',  (0,0), (-1,-1), 1, VERDE_MED),
    ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#d1fae5')),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ('ALIGN', (1,0), (1,-1), 'LEFT'),
    ('ALIGN', (3,0), (3,-1), 'LEFT'),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('TOPPADDING',    (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ('LEFTPADDING',   (0,0), (-1,-1), 6),
]))
story.append(rep_tbl)
story.append(Spacer(1, 0.3*cm))
story.append(HRFlowable(width='100%', thickness=1, color=VERDE_MED))
story.append(Spacer(1, 0.2*cm))
story.append(Paragraph('Nos topicos a seguir, cada modulo e explicado em detalhes.', CORPO))

# ════════════════════════════════════════════════════════════════
# Funcao auxiliar para cabecalho de modulo
# ════════════════════════════════════════════════════════════════
def secao_header(emoji, titulo, subtitulo=''):
    sub = f'<br/><font size="9" color="#d1fae5">{subtitulo}</font>' if subtitulo else ''
    return Table(
        [[Paragraph(f'<b>{emoji}  {titulo}</b>{sub}', SECAO)]],
        colWidths=[doc.width],
        style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), VERDE_ESCURO),
            ('TOPPADDING',    (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('LEFTPADDING',   (0,0), (-1,-1), 14),
        ])
    )

def passo_box(passos):
    """Recebe lista de strings, devolve tabela estilizada."""
    rows = [[Paragraph(f'<b>{i+1}.</b>  {p}', PASSO)] for i, p in enumerate(passos)]
    t = Table(rows, colWidths=[doc.width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CINZA_CLARO),
        ('LEFTBORDERPADDING', (0,0), (-1,-1), 6),
        ('BOX',  (0,0), (-1,-1), 0.8, VERDE_MED),
        ('LINEABOVE', (0,1), (-1,-1), 0.3, colors.HexColor('#d1fae5')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
    ]))
    return t

def info_box(texto, cor_bg=AZUL_BG, cor_borda=AZUL_INFO):
    t = Table([[Paragraph(texto, NOTA)]], colWidths=[doc.width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), cor_bg),
        ('BOX', (0,0), (-1,-1), 0.8, cor_borda),
        ('TOPPADDING',    (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
    ]))
    return t

def sp(n=0.3):
    return Spacer(1, n*cm)

# ════════════════════════════════════════════════════════════════
# 1. SCANNER DE PRESENCA
# ════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(secao_header('📷', 'Scanner de Presenca', 'Caminho: /scanner'))
story.append(sp())
story.append(Paragraph(
    'O Scanner de Presenca permite registrar a presenca dos alunos usando o <b>QR Code</b> '
    'de cada um. E usado com um tablet ou celular com camera.',
    CORPO
))
story.append(sp(0.25))
story.append(passo_box([
    'Acesse o menu <b>Scanner de Presenca</b> no painel.',
    'Selecione o modo <b>PRESENCA</b> no seletor do topo da tela.',
    'Escolha a <b>turma</b> que sera escaneada.',
    'Clique em <b>Iniciar Camera</b>. A camera do dispositivo sera ativada.',
    'Aponte a camera para o <b>QR Code do aluno</b>. O sistema le automaticamente.',
    'Um sinal <b>verde</b> confirma que a presenca foi registrada com sucesso.',
    'Repita para cada aluno na fila. O sistema nao registra o mesmo aluno duas vezes.',
]))
story.append(sp(0.2))
story.append(info_box(
    'ℹ️  Dica: Use o celular ou tablet na horizontal para melhorar a leitura dos QR Codes. '
    'Caso a camera nao abra, verifique se o navegador tem permissao de acesso a camera.'
))

# ════════════════════════════════════════════════════════════════
# 2. SCANNER GAME ALUNO
# ════════════════════════════════════════════════════════════════
story.append(sp())
story.append(secao_header('📲', 'Scanner Game Aluno', 'Caminho: /scanner/portal'))
story.append(sp())
story.append(Paragraph(
    'O Scanner Game Aluno e o portal pelo qual o proprio aluno escaneia o QR Code para '
    'ganhar pontos no <b>ItagGame</b>. O representante auxilia no processo.',
    CORPO
))
story.append(sp(0.25))
story.append(passo_box([
    'Acesse o menu <b>Scanner Game Aluno</b>.',
    'O aluno aponta o celular para o QR Code da atividade ou evento.',
    'O sistema valida e adiciona os pontos automaticamente ao perfil do aluno.',
    'Uma mensagem de confirmacao aparece na tela com os pontos ganhos.',
]))
story.append(sp(0.2))
story.append(info_box(
    'ℹ️  Importante: Cada QR Code so pode ser escaneado uma vez por aluno. '
    'Se aparecer mensagem de erro, o aluno ja registrou aquela atividade.'
))

# ════════════════════════════════════════════════════════════════
# 3. TURMAS E ALUNOS
# ════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(secao_header('👥', 'Turmas e Alunos', 'Caminho: /turmas'))
story.append(sp())
story.append(Paragraph(
    'Nesta secao voce pode <b>consultar as turmas</b> e ver a lista de alunos de cada turma. '
    'O representante tem acesso de <b>leitura</b> — nao e possivel criar, editar ou excluir turmas.',
    CORPO
))
story.append(sp(0.25))
story.append(passo_box([
    'Clique em <b>Turmas e Alunos</b> no menu.',
    'Sera exibida a lista de turmas da escola.',
    'Clique no nome de uma turma para ver os <b>alunos matriculados</b>.',
    'Voce pode visualizar nome, turma e QR Code de cada aluno.',
    'Para imprimir a lista, use o botao de impressao do navegador (Ctrl+P).',
]))
story.append(sp(0.2))
story.append(info_box(
    '⚠️  Atencao: Voce apenas VISUALIZA as turmas e alunos. '
    'Para criar ou editar dados, fale com o coordenador.',
    cor_bg=AMARELO_AVISO, cor_borda=DOURADO_BORDA
))

# ════════════════════════════════════════════════════════════════
# 4. QUIZ INTERATIVO
# ════════════════════════════════════════════════════════════════
story.append(sp())
story.append(secao_header('🎯', 'Quiz Interativo', 'Caminho: /quiz  |  Criar: /quiz/novo'))
story.append(sp())
story.append(Paragraph(
    'O Quiz Interativo permite <b>criar quizzes de perguntas e respostas</b> para os alunos. '
    'E uma ferramenta poderosa para revisar conteudos de forma divertida.',
    CORPO
))
story.append(sp(0.25))
story.append(Paragraph('<b>Como criar um novo quiz:</b>', ITEM_TITULO))
story.append(sp(0.1))
story.append(passo_box([
    'Acesse <b>Criar Quiz</b> no menu ou clique no botao "Novo Quiz" dentro da secao Quiz.',
    'Informe o <b>titulo</b> do quiz e a <b>disciplina</b> relacionada.',
    'Clique em <b>Adicionar Pergunta</b> e escreva a pergunta.',
    'Adicione as alternativas (minimo 2, maximo 4) e marque qual e a <b>resposta correta</b>.',
    'Repita para cada pergunta desejada.',
    'Clique em <b>Salvar Quiz</b>. O quiz ja fica disponivel para os alunos jogarem.',
]))
story.append(sp(0.2))
story.append(Paragraph('<b>Como acompanhar os resultados:</b>', ITEM_TITULO))
story.append(sp(0.1))
story.append(passo_box([
    'Acesse <b>Quiz Interativo</b> no menu.',
    'Localize o quiz desejado na lista.',
    'Clique em <b>Ver Resultados</b> para ver o desempenho dos alunos.',
]))

# ════════════════════════════════════════════════════════════════
# 5. COPA DO SABER
# ════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(secao_header('⚽', 'Copa do Saber', 'Caminho: /quiz-copa/'))
story.append(sp())
story.append(Paragraph(
    'A <b>Copa do Saber</b> e um quiz especial no formato de Copa do Mundo. Os alunos '
    'respondem perguntas para fazer seus times avancarem nas fases do torneio.',
    CORPO
))
story.append(sp(0.25))
story.append(passo_box([
    'Acesse <b>Copa do Saber</b> no menu.',
    'Selecione a turma ou abra o quiz para todos.',
    'Os alunos escolhem o <b>time que querem representar</b>.',
    'Cada resposta correta avanca o time na tabela.',
    'Acompanhe o placar em tempo real na tela principal.',
    'Ao final, o time com mais pontos e campeao da Copa do Saber!',
]))
story.append(sp(0.2))
story.append(info_box(
    '🏆  Dica: Use a Copa do Saber em dias de revisao antes de provas. '
    'A competicao anima a turma e ajuda a fixar o conteudo!'
))

# ════════════════════════════════════════════════════════════════
# 6. ALBUM DOS CRAQUES
# ════════════════════════════════════════════════════════════════
story.append(sp())
story.append(secao_header('🏆', 'Album dos Craques', 'Caminho: /album'))
story.append(sp())
story.append(Paragraph(
    'O <b>Album dos Craques</b> e uma colecao de figurinhas digitais inspirada na Copa do Mundo 2026. '
    'Os alunos ganham pacotes de figurinhas realizando atividades na plataforma.',
    CORPO
))
story.append(sp(0.25))
story.append(Paragraph('<b>Como os alunos ganham figurinhas:</b>', ITEM_TITULO))
story.append(sp(0.1))

ganhar_data = [
    [Paragraph('<b>Forma</b>', CORPO), Paragraph('<b>Como funciona</b>', CORPO)],
    ['✅ Presenca',      'Registrar presenca pelo Scanner ganha 1 pacote por dia'],
    ['🎯 Quiz',          'Completar um quiz ganha pacotes conforme o desempenho'],
    ['🎮 ItagGame',      'Subir de nivel ou completar missoes no ItagGame'],
]
ganhar_tbl = Table(ganhar_data, colWidths=[3.5*cm, doc.width - 3.5*cm])
ganhar_tbl.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), VERDE_MED),
    ('TEXTCOLOR',  (0,0), (-1,0), BRANCO),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [CINZA_CLARO, BRANCO]),
    ('BOX',  (0,0), (-1,-1), 0.8, VERDE_MED),
    ('GRID', (0,0), (-1,-1), 0.3, colors.HexColor('#d1fae5')),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('TOPPADDING',    (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ('LEFTPADDING',   (0,0), (-1,-1), 8),
]))
story.append(ganhar_tbl)
story.append(sp(0.2))
story.append(passo_box([
    'Acesse <b>Album dos Craques</b> no menu.',
    'Clique em <b>Abrir Pacote</b> para revelar novas figurinhas.',
    'As figurinhas novas aparecem coloridas. As repetidas ficam em cinza.',
    'Complete o album coletando todos os jogadores dos 32 times.',
]))

# ════════════════════════════════════════════════════════════════
# 7. ITAGAME — PAINEL
# ════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(secao_header('🎮', 'ItagGame — Painel', 'Caminho: /itagame'))
story.append(sp())
story.append(Paragraph(
    'O <b>ItagGame</b> e o sistema de gamificacao da plataforma. Os alunos acumulam <b>XP (pontos de experiencia)</b>, '
    'sobem de nivel e completam missoes. O representante pode acompanhar o painel da sua turma.',
    CORPO
))
story.append(sp(0.25))
story.append(passo_box([
    'Acesse <b>ItagGame — Painel</b> no menu.',
    'Selecione a turma para ver o <b>ranking dos alunos</b>.',
    'Veja o nivel atual, XP total e as missoes ativas de cada aluno.',
    'Use o painel para motivar os alunos mostrando quem esta na frente.',
    'As missoes ativas aparecem na aba <b>Missoes</b>. Incentive os alunos a completarem.',
]))
story.append(sp(0.2))
story.append(info_box(
    '⚠️  Atencao: O representante APENAS VISUALIZA o painel. '
    'Nao e permitido editar XP, criar missoes ou alterar dados dos alunos.',
    cor_bg=AMARELO_AVISO, cor_borda=DOURADO_BORDA
))

# ════════════════════════════════════════════════════════════════
# 8. CRIAR AVALIACOES
# ════════════════════════════════════════════════════════════════
story.append(sp())
story.append(secao_header('📝', 'Criar Avaliacoes', 'Caminho: /avaliacoes/nova'))
story.append(sp())
story.append(Paragraph(
    'Nesta secao voce pode criar <b>avaliacoes formais</b> para os alunos. '
    'Diferente do quiz, as avaliacoes ficam registradas no historico pedagogico.',
    CORPO
))
story.append(sp(0.25))
story.append(passo_box([
    'Clique em <b>Criar Avaliacoes</b> no menu.',
    'Preencha o <b>titulo</b> da avaliacao, a <b>disciplina</b> e a <b>data</b>.',
    'Escolha o <b>tipo</b>: objetiva (multipla escolha) ou descritiva.',
    'Adicione as questoes uma a uma, informando o enunciado e as alternativas.',
    'Para objetivas, marque a <b>resposta correta</b> de cada questao.',
    'Defina a <b>nota maxima</b> e o <b>peso</b> de cada questao (se necessario).',
    'Clique em <b>Salvar Avaliacao</b>. Ela ficara disponivel para o coordenador revisar.',
]))
story.append(sp(0.2))
story.append(info_box(
    'ℹ️  Dica: Apos salvar, avise o coordenador para revisar e publicar a avaliacao. '
    'So o coordenador pode tornar a avaliacao visivel para os alunos.'
))

# ════════════════════════════════════════════════════════════════
# PAGINA FINAL — Resumo e contatos
# ════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(secao_header('📋', 'Resumo dos Menus', 'Tudo que voce pode acessar'))
story.append(sp())

resumo_data = [
    [Paragraph('<b>Menu</b>', CORPO), Paragraph('<b>O que faz</b>', CORPO), Paragraph('<b>Pode criar?</b>', CORPO)],
    ['📷 Scanner de Presenca', 'Registra presenca dos alunos via QR Code',          'Nao'],
    ['📲 Scanner Game Aluno',  'Aluno escaneia QR para ganhar pontos',               'Nao'],
    ['👥 Turmas e Alunos',     'Visualiza listas de turmas e alunos',               'Nao'],
    ['🎯 Quiz Interativo',     'Cria e aplica quizzes de perguntas',                'Sim'],
    ['⚽ Copa do Saber',       'Quiz especial em formato Copa do Mundo',             'Nao'],
    ['🏆 Album dos Craques',   'Abre pacotes e coleciona figurinhas digitais',       'Nao'],
    ['🎮 ItagGame — Painel',   'Acompanha ranking e missoes dos alunos',            'Nao'],
    ['📝 Criar Avaliacoes',    'Cria avaliacoes formais registradas no sistema',     'Sim'],
]
res_tbl = Table(resumo_data, colWidths=[4.5*cm, 9*cm, 2*cm])
res_tbl.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), VERDE_ESCURO),
    ('TEXTCOLOR',  (0,0), (-1,0), BRANCO),
    ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [CINZA_CLARO, BRANCO]),
    ('BOX',  (0,0), (-1,-1), 1, VERDE_MED),
    ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#d1fae5')),
    ('ALIGN', (2,0), (2,-1), 'CENTER'),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('TOPPADDING',    (0,0), (-1,-1), 7),
    ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ('LEFTPADDING',   (0,0), (-1,-1), 8),
]))
story.append(res_tbl)
story.append(sp(0.5))

# Box de regras
regras = Table([[Paragraph(
    '<b>🔒 Regras importantes para o Representante Liga Jovem:</b><br/>'
    '• Voce e um representante — use a plataforma com responsabilidade<br/>'
    '• Nao compartilhe sua senha com nenhum colega<br/>'
    '• Nao tente acessar menus que nao estao na sua lista<br/>'
    '• Em caso de duvidas, procure o professor ou o coordenador<br/>'
    '• Qualquer problema tecnico: avise o responsavel pelo evento Liga Jovem',
    CORPO
)]], colWidths=[doc.width])
regras.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), DOURADO_CLARO),
    ('BOX', (0,0), (-1,-1), 1.2, DOURADO_BORDA),
    ('TOPPADDING',    (0,0), (-1,-1), 14),
    ('BOTTOMPADDING', (0,0), (-1,-1), 14),
    ('LEFTPADDING',   (0,0), (-1,-1), 14),
]))
story.append(regras)
story.append(sp(0.5))

# Rodape final
rodape_final = Table([[Paragraph(
    'ITA Tecnologia Educacional  ·  itatecnologiaeducacional.tech  ·  '
    'Desafio Liga Jovem 2026  ·  CEITEC Itapipoca/CE',
    RODAPE
)]], colWidths=[doc.width])
rodape_final.setStyle(TableStyle([
    ('TOPPADDING',    (0,0), (-1,-1), 8),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('LINEABOVE', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')),
]))
story.append(rodape_final)

# ── Gerar ──────────────────────────────────────────────────────
doc.build(story)
print(f"PDF gerado com sucesso: {OUTPUT}")

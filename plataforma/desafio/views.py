"""
Views do Dia do Desafio — CEITEC Itapipoca
Inscrição pública + Dashboard admin + Comprovante PDF + Banner Instagram
"""
import io
import csv
import json

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.utils import timezone

# Usa o decorator de autenticação do próprio ITA (redireciona para /login/ correto)
from ita_core.views import require_tipo

from .models import CategoriaDesafio, AtividadeDesafio, InscricaoDesafio


# ─── Área pública (sem login) ──────────────────────────────────────────────────

def pagina_publica_desafio(request):
    """Renderiza a página pública de inscrição — dark theme, responsiva para mobile."""
    categorias = CategoriaDesafio.objects.filter(ativo=True).prefetch_related('atividades')
    return render(request, 'desafio/inscricao_publica.html', {'categorias': categorias})


@require_GET
def get_atividades(request, categoria_id):
    """Retorna as atividades de uma categoria em JSON (usado pelo formulário dinâmico)."""
    atividades = AtividadeDesafio.objects.filter(
        categoria_id=categoria_id
    ).exclude(nome__startswith='_').values('id', 'nome')
    return JsonResponse({'atividades': list(atividades)})


@csrf_exempt
@require_POST
def inscricao_desafio(request):
    """Recebe o POST JSON do formulário público e salva a inscrição."""
    try:
        data = json.loads(request.body)
        tipo         = data.get('tipo')
        categoria_id = data.get('categoria')
        atividade_id = data.get('atividade')

        # Validações básicas dos campos obrigatórios
        for campo in ['nome_completo', 'email', 'telefone', 'data_nascimento']:
            if not data.get(campo):
                return JsonResponse({'sucesso': False, 'erro': f'Campo "{campo}" é obrigatório.'})

        if not tipo:
            return JsonResponse({'sucesso': False, 'erro': 'Tipo de participante não informado.'})

        if not categoria_id or not atividade_id:
            return JsonResponse({'sucesso': False, 'erro': 'Selecione a categoria e a atividade.'})

        # Validações por tipo de participante
        if tipo == 'aluno' and not data.get('escola'):
            return JsonResponse({'sucesso': False, 'erro': 'Escola é obrigatória para alunos.'})

        if tipo == 'comunidade' and not data.get('cpf'):
            return JsonResponse({'sucesso': False, 'erro': 'CPF é obrigatório para participantes da comunidade.'})

        # Verifica se a categoria e atividade existem
        try:
            categoria = CategoriaDesafio.objects.get(pk=categoria_id, ativo=True)
            atividade = AtividadeDesafio.objects.get(pk=atividade_id, categoria=categoria)
        except (CategoriaDesafio.DoesNotExist, AtividadeDesafio.DoesNotExist):
            return JsonResponse({'sucesso': False, 'erro': 'Categoria ou atividade inválida.'})

        # Cria a inscrição
        inscricao = InscricaoDesafio.objects.create(
            tipo            = tipo,
            categoria       = categoria,
            atividade       = atividade,
            nome_completo   = data.get('nome_completo', '').strip(),
            email           = data.get('email', '').strip(),
            telefone        = data.get('telefone', '').strip(),
            data_nascimento = data.get('data_nascimento'),
            escola          = data.get('escola', '').strip(),
            turma           = data.get('turma', '').strip(),
            matricula       = data.get('matricula', '').strip(),
            cpf             = data.get('cpf', '').strip(),
            cidade          = data.get('cidade', '').strip(),
        )

        return JsonResponse({
            'sucesso':   True,
            'numero':    inscricao.numero_inscricao,
            'nome':      inscricao.nome_completo,
            'categoria': inscricao.categoria.nome,
            'atividade': inscricao.atividade.nome,
        })

    except json.JSONDecodeError:
        return JsonResponse({'sucesso': False, 'erro': 'Dados inválidos (JSON malformado).'})
    except Exception as e:
        return JsonResponse({'sucesso': False, 'erro': str(e)})


def comprovante_pdf(request, numero):
    """
    Gera o comprovante em PDF com ReportLab + QR Code.
    Gerado em memória com io.BytesIO — sem salvar em disco.
    Acesso público (qualquer um com o número de inscrição pode baixar).
    """
    try:
        inscricao = InscricaoDesafio.objects.get(numero_inscricao=numero)
    except InscricaoDesafio.DoesNotExist:
        raise Http404('Inscrição não encontrada.')

    # Importações locais para não quebrar se as libs não estiverem instaladas
    import qrcode
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    cor_verde  = colors.HexColor('#1D9E75')
    cor_escura = colors.HexColor('#0a0a0a')
    cor_cinza  = colors.HexColor('#888888')

    titulo_style = ParagraphStyle(
        'titulo', parent=styles['Title'],
        textColor=cor_verde, fontSize=26, spaceAfter=4,
    )
    subtitulo_style = ParagraphStyle(
        'sub', parent=styles['Normal'],
        textColor=cor_escura, fontSize=13, spaceAfter=4,
    )
    campo_style = ParagraphStyle(
        'campo', parent=styles['Normal'],
        fontSize=12, spaceAfter=6, leading=18,
    )
    rodape_style = ParagraphStyle(
        'rodape', parent=styles['Normal'],
        fontSize=9, textColor=cor_cinza, spaceAfter=0,
    )

    # Gera QR Code com o número de inscrição
    qr = qrcode.QRCode(version=1, box_size=5, border=2)
    qr.add_data(f'DESAFIO-{numero}')
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color='black', back_color='white')
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    story = [
        Paragraph('🏆 DIA DO DESAFIO', titulo_style),
        Paragraph('COMPROVANTE DE INSCRIÇÃO', subtitulo_style),
        Spacer(1, 0.6*cm),
        Paragraph(f'<b>Número:</b>  {inscricao.numero_inscricao}', campo_style),
        Paragraph(f'<b>Nome:</b>  {inscricao.nome_completo}', campo_style),
        Paragraph(f'<b>Tipo:</b>  {inscricao.get_tipo_display()}', campo_style),
        Paragraph(f'<b>Categoria:</b>  {inscricao.categoria.nome}', campo_style),
        Paragraph(f'<b>Atividade:</b>  {inscricao.atividade.nome}', campo_style),
    ]

    # Campos extras conforme tipo de participante
    if inscricao.tipo == 'aluno':
        if inscricao.escola:
            story.append(Paragraph(f'<b>Escola:</b>  {inscricao.escola}', campo_style))
        if inscricao.turma:
            story.append(Paragraph(f'<b>Turma:</b>  {inscricao.turma}', campo_style))
    else:
        if inscricao.cidade:
            story.append(Paragraph(f'<b>Cidade:</b>  {inscricao.cidade}', campo_style))

    story += [
        Paragraph(f'<b>Inscrito em:</b>  {inscricao.criado_em.strftime("%d/%m/%Y às %H:%M")}', campo_style),
        Spacer(1, 0.6*cm),
        RLImage(qr_buffer, width=4*cm, height=4*cm),
        Spacer(1, 0.6*cm),
        Paragraph('CEITEC — Centro Educacional de Inovação e Tecnologia', rodape_style),
        Paragraph('Itapipoca, Ceará — 2026', rodape_style),
    ]

    doc.build(story)
    buffer.seek(0)

    response = HttpResponse(buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename=comprovante_{numero}.pdf'
    return response


# ─── Área admin (requer login + is_staff) ────────────────────────────────────

@require_tipo('admin')
def dashboard_desafio(request):
    """Dashboard admin com acompanhamento em tempo real das inscrições."""
    categorias = CategoriaDesafio.objects.filter(ativo=True)
    return render(request, 'desafio/dashboard.html', {'categorias': categorias})


@require_tipo('admin')
def stats_desafio_json(request):
    """Retorna JSON com estatísticas em tempo real — chamado pelo polling do dashboard."""
    categorias = CategoriaDesafio.objects.filter(ativo=True)
    por_categoria = []
    for cat in categorias:
        alunos     = InscricaoDesafio.objects.filter(categoria=cat, tipo='aluno').count()
        comunidade = InscricaoDesafio.objects.filter(categoria=cat, tipo='comunidade').count()
        por_categoria.append({
            'nome':      cat.nome,
            'icone':     cat.icone,
            'alunos':    alunos,
            'comunidade': comunidade,
            'total':     alunos + comunidade,
        })

    # Últimas 20 inscrições para exibir na tabela do dashboard
    ultimas = InscricaoDesafio.objects.select_related(
        'categoria', 'atividade'
    ).order_by('-criado_em')[:20]

    ultimas_list = [{
        'numero':    i.numero_inscricao,
        'nome':      i.nome_completo,
        'tipo':      i.get_tipo_display(),
        'categoria': i.categoria.nome,
        'atividade': i.atividade.nome,
        'horario':   i.criado_em.strftime('%H:%M:%S'),
    } for i in ultimas]

    return JsonResponse({
        'total':              InscricaoDesafio.objects.count(),
        'alunos':             InscricaoDesafio.objects.filter(tipo='aluno').count(),
        'comunidade':         InscricaoDesafio.objects.filter(tipo='comunidade').count(),
        'por_categoria':      por_categoria,
        'ultimas_inscricoes': ultimas_list,
        'atualizado_em':      timezone.now().strftime('%H:%M:%S'),
    })


@require_tipo('admin')
def lista_inscricoes(request):
    """Lista todas as inscrições (JSON) — usada pelo dashboard."""
    todas = InscricaoDesafio.objects.select_related(
        'categoria', 'atividade'
    ).order_by('-criado_em')

    resultado = [{
        'numero':    i.numero_inscricao,
        'nome':      i.nome_completo,
        'tipo':      i.get_tipo_display(),
        'categoria': i.categoria.nome,
        'atividade': i.atividade.nome,
        'email':     i.email,
        'telefone':  i.telefone,
        'horario':   i.criado_em.strftime('%d/%m/%Y %H:%M'),
    } for i in todas]

    return JsonResponse({'inscricoes': resultado, 'total': len(resultado)})


@require_tipo('admin')
def exportar_csv(request):
    """Exporta todas as inscrições como arquivo CSV com encoding UTF-8-BOM (compatível com Excel)."""
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = 'attachment; filename=inscricoes_desafio.csv'

    writer = csv.writer(response)
    writer.writerow([
        'Número', 'Nome', 'Tipo', 'Categoria', 'Atividade',
        'E-mail', 'Telefone', 'Data de Nascimento',
        'Escola', 'Turma', 'Matrícula',
        'CPF', 'Cidade', 'Data de Inscrição',
    ])

    for i in InscricaoDesafio.objects.select_related('categoria', 'atividade').all():
        writer.writerow([
            i.numero_inscricao,
            i.nome_completo,
            i.get_tipo_display(),
            i.categoria.nome,
            i.atividade.nome,
            i.email,
            i.telefone,
            i.data_nascimento.strftime('%d/%m/%Y') if i.data_nascimento else '',
            i.escola,
            i.turma,
            i.matricula,
            i.cpf,
            i.cidade,
            i.criado_em.strftime('%d/%m/%Y %H:%M'),
        ])

    return response


@require_tipo('admin')
def banner_instagram(request):
    """
    Gera Story 1080×1920px para Instagram.
    Visual idêntico à página de inscrição: fundo escuro #070f0c,
    tag amarela, título DIA DO DESAFIO, pills de modalidade, link em destaque.
    """
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1080, 1920

    # ── Fundo escuro base ─────────────────────────────────────────────────
    img  = Image.new('RGB', (W, H), '#070f0c')
    draw = ImageDraw.Draw(img)

    # Gradiente radial verde escuro no topo (camadas de elipse)
    cx = W // 2
    for i in range(40, 0, -1):
        t = i / 40
        r = int(7  + t * 12)
        g = int(15 + t * 35)
        b = int(12 + t * 20)
        ew = int(W * 0.9 * t)
        eh = int(700 * t)
        draw.ellipse([cx - ew, -eh//2, cx + ew, eh], fill=(r, g, b))

    # Blob decorativo canto superior direito
    draw.ellipse([820, -80,  1180, 280],  fill='#0a1f16')
    draw.ellipse([880, -20,  1140, 240],  fill='#0d2b1c')

    # Blob decorativo canto inferior esquerdo
    draw.ellipse([-100, 1680, 260, 2020], fill='#0a1f16')
    draw.ellipse([-40,  1720, 200, 1980], fill='#0d2b1c')

    # ── Fontes: usa Vera (ReportLab) que estão sempre disponíveis no container
    import os as _os
    _rl = '/usr/local/lib/python3.11/site-packages/reportlab/fonts'
    B = _os.path.join(_rl, 'VeraBd.ttf')   # negrito
    R = _os.path.join(_rl, 'Vera.ttf')     # regular
    try:
        f_tag    = ImageFont.truetype(B, 32)
        f_titulo = ImageFont.truetype(B, 160)
        f_des    = ImageFont.truetype(B, 160)
        f_sub    = ImageFont.truetype(R, 42)
        f_pill   = ImageFont.truetype(B, 44)
        f_cta    = ImageFont.truetype(B, 54)
        f_link   = ImageFont.truetype(B, 38)
        f_small  = ImageFont.truetype(R, 30)
        f_card   = ImageFont.truetype(B, 52)
    except OSError:
        f_tag = f_titulo = f_des = f_sub = f_pill = f_cta = f_link = f_small = f_card = ImageFont.load_default()

    def text_w(txt, fnt):
        bb = draw.textbbox((0, 0), txt, font=fnt)
        return bb[2] - bb[0]

    def pill(cx, cy, txt, fnt, bg, fg, pad_x=32, pad_y=18, radius=30, border=None):
        """Desenha uma pill centralizada em (cx, cy)."""
        tw = text_w(txt, fnt)
        th_bb = draw.textbbox((0, 0), txt, font=fnt)
        th = th_bb[3] - th_bb[1]
        w2 = tw + pad_x * 2
        h2 = th + pad_y * 2
        x0, y0 = cx - w2 // 2, cy - h2 // 2
        x1, y1 = cx + w2 // 2, cy + h2 // 2
        if border:
            draw.rounded_rectangle([x0 - 3, y0 - 3, x1 + 3, y1 + 3], radius=radius + 3, fill=border)
        draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=bg)
        draw.text((cx, cy), txt, font=fnt, fill=fg, anchor='mm')
        return w2, h2

    # ══════════════════════════════════════════════════════════════════════
    # BLOCO 1 — TAG no topo
    # ══════════════════════════════════════════════════════════════════════
    tag = 'CEITEC – ITAPIPOCA, CE – 2026'
    pill(W // 2, 130, tag, f_tag, bg='#070f0c', fg='#FFD600',
         pad_x=36, pad_y=16, radius=50, border='#FFD600')

    # ══════════════════════════════════════════════════════════════════════
    # BLOCO 2 — Título principal
    # ══════════════════════════════════════════════════════════════════════
    draw.text((W // 2, 380), 'DIA DO',  font=f_titulo, fill='#FFFFFF', anchor='mm')
    draw.text((W // 2, 560), 'DESAFIO', font=f_des,    fill='#FFD600', anchor='mm')

    # Subtítulo
    draw.text((W // 2, 670),
              'Inscreva-se gratuitamente e venha se superar!',
              font=f_sub, fill='#c8e6d8', anchor='mm')

    # ══════════════════════════════════════════════════════════════════════
    # BLOCO 3 — Pills de modalidade (igual à página)
    # ══════════════════════════════════════════════════════════════════════
    mods = [('🚴  Ciclismo', 340), ('🏃  Corrida', 700), ('🥾  Trilha', 1040)]
    y_mod = 800
    for label, cx_mod in mods:
        pill(cx_mod, y_mod, label, f_pill,
             bg='#111c15', fg='#FFD600', pad_x=28, pad_y=16, radius=40, border='#FFD600')

    # ══════════════════════════════════════════════════════════════════════
    # BLOCO 4 — Separador
    # ══════════════════════════════════════════════════════════════════════
    draw.rectangle([80, 920, W - 80, 923], fill='#1D9E75')

    # ══════════════════════════════════════════════════════════════════════
    # BLOCO 5 — Cards "Sou Aluno" e "Comunidade" (igual à página)
    # ══════════════════════════════════════════════════════════════════════
    f_card_title = f_card

    draw.text((W // 2, 990), 'Como você vai participar?',
              font=f_cta, fill='#FFFFFF', anchor='mm')

    # Card esquerdo — Sou Aluno
    cx_al, cy_al = 290, 1175
    draw.rounded_rectangle([cx_al - 230, cy_al - 110, cx_al + 230, cy_al + 110],
                            radius=22, fill='#111c15', outline='#2a4a38', width=2)
    draw.text((cx_al, cy_al - 30), '🎒', font=f_titulo, fill='#FFFFFF', anchor='mm')
    draw.text((cx_al, cy_al + 65), 'Sou Aluno', font=f_card_title, fill='#FFFFFF', anchor='mm')

    # Card direito — Comunidade
    cx_co, cy_co = 790, 1175
    draw.rounded_rectangle([cx_co - 230, cy_co - 110, cx_co + 230, cy_co + 110],
                            radius=22, fill='#111c15', outline='#2a4a38', width=2)
    draw.text((cx_co, cy_co - 30), '🏃', font=f_titulo, fill='#FFFFFF', anchor='mm')
    draw.text((cx_co, cy_co + 65), 'Comunidade', font=f_card_title, fill='#FFFFFF', anchor='mm')

    # ══════════════════════════════════════════════════════════════════════
    # BLOCO 6 — CTA + Link destacado
    # ══════════════════════════════════════════════════════════════════════
    draw.text((W // 2, 1400), 'Inscrições Abertas!', font=f_cta, fill='#1D9E75', anchor='mm')

    # Caixa do link — fundo verde com texto branco
    link = 'itatecnologiaeducacional.tech/desafio'
    lw = text_w(link, f_link)
    pad = 36
    lx0, ly0 = W // 2 - lw // 2 - pad, 1450
    lx1, ly1 = W // 2 + lw // 2 + pad, 1450 + 68
    draw.rounded_rectangle([lx0, ly0, lx1, ly1], radius=14, fill='#1D9E75')
    draw.text((W // 2, (ly0 + ly1) // 2), link, font=f_link, fill='#FFFFFF', anchor='mm')

    # ══════════════════════════════════════════════════════════════════════
    # RODAPÉ
    # ══════════════════════════════════════════════════════════════════════
    draw.text((W // 2, 1580), '#DiadoDesafio  #CEITEC  #Itapipoca',
              font=f_small, fill='#3a6450', anchor='mm')
    draw.text((W // 2, 1640),
              'CEITEC — Centro Educacional de Inovacao e Tecnologia',
              font=f_small, fill='#2d4a3e', anchor='mm')
    draw.text((W // 2, 1680), 'Itapipoca, Ceara  •  2026',
              font=f_small, fill='#2d4a3e', anchor='mm')

    buffer = io.BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)

    response = HttpResponse(buffer.read(), content_type='image/png')
    response['Content-Disposition'] = 'attachment; filename=story_dia_do_desafio.png'
    return response

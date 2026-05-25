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
    Gera banner 1080×1080px para o Instagram com Pillow.
    Visual idêntico à página de inscrição: fundo escuro, amarelo #FFD600, verde #1D9E75.
    Gerado em memória — sem salvar em disco.
    """
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1080, 1080

    # ── Fundo escuro com gradiente simulado ────────────────────────────────
    img  = Image.new('RGB', (W, H), color='#070f0c')
    draw = ImageDraw.Draw(img)

    # Gradiente radial simulado no topo (ellipse grande verde escuro)
    for i in range(30, 0, -1):
        alpha = int(18 * (i / 30))
        r = int(14 + (30 - i) * 1.2)
        g = int(42 + (30 - i) * 1.8)
        b = int(30 + (30 - i) * 0.8)
        draw.ellipse(
            [W//2 - i*28, -i*15, W//2 + i*28, i*22],
            fill=(r, g, b)
        )

    # ── Decorações geométricas — igual à inscrição ─────────────────────────
    # Canto superior direito: círculo verde
    draw.ellipse([780, -160, 1240, 300],  fill='#0e2a1e')
    draw.ellipse([840, -100, 1160, 220],  fill='#1D9E75')

    # Canto inferior esquerdo: círculo verde escuro
    draw.ellipse([-160, 780, 300, 1240],  fill='#0e2a1e')
    draw.ellipse([-100, 840, 220, 1160],  fill='#0F6E56')

    # Linha divisória horizontal amarela
    draw.rectangle([60, 590, 1020, 596], fill='#FFD600')

    # ── Fontes ────────────────────────────────────────────────────────────
    try:
        bold_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
        reg_path  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        f_tag     = ImageFont.truetype(bold_path, 28)   # tag CEITEC
        f_ano     = ImageFont.truetype(bold_path, 38)   # 2026
        f_titulo  = ImageFont.truetype(bold_path, 108)  # DIA DO
        f_titulo2 = ImageFont.truetype(bold_path, 108)  # DESAFIO
        f_cat     = ImageFont.truetype(bold_path, 50)   # modalidades
        f_cta     = ImageFont.truetype(bold_path, 46)   # CTA
        f_link    = ImageFont.truetype(reg_path,  34)   # link
        f_hash    = ImageFont.truetype(reg_path,  30)   # hashtags
    except OSError:
        f_tag = f_ano = f_titulo = f_titulo2 = f_cat = f_cta = f_link = f_hash = ImageFont.load_default()

    # ── Tag amarela "CEITEC — ITAPIPOCA 2026" ─────────────────────────────
    tag_text = 'CEITEC  •  ITAPIPOCA  •  2026'
    tag_bbox = draw.textbbox((0, 0), tag_text, font=f_tag)
    tag_w    = tag_bbox[2] - tag_bbox[0]
    tag_x    = (W - tag_w) // 2
    # Fundo amarelo arredondado (simulado com retângulo)
    pad = 16
    draw.rounded_rectangle(
        [tag_x - pad, 105, tag_x + tag_w + pad, 105 + 46],
        radius=23, fill='#FFD600'
    )
    draw.text((W // 2, 128), tag_text, font=f_tag, fill='#070f0c', anchor='mm')

    # ── Título principal "DIA DO DESAFIO" ─────────────────────────────────
    draw.text((W // 2, 280), 'DIA DO',  font=f_titulo,  fill='#FFFFFF', anchor='mm')
    draw.text((W // 2, 400), 'DESAFIO', font=f_titulo2, fill='#FFD600', anchor='mm')

    # ── Subtítulo verde ────────────────────────────────────────────────────
    draw.text((W // 2, 500), 'Evento esportivo CEITEC Itapipoca', font=f_ano, fill='#c8e6d8', anchor='mm')

    # ── Modalidades (abaixo da linha) ─────────────────────────────────────
    draw.text((W // 2, 660), '🚴  Ciclismo    🏃  Corrida    🥾  Trilha', font=f_cat, fill='#FFFFFF', anchor='mm')

    # ── Pills das distâncias ───────────────────────────────────────────────
    pills = ['1 km', '2 km', '800 m', '1 km']
    total_w = sum(80 for _ in pills) + 12 * (len(pills) - 1)
    px = (W - total_w) // 2
    for p in pills:
        pw = 80
        draw.rounded_rectangle([px, 730, px + pw, 782], radius=14, fill='#FFD600')
        pb = draw.textbbox((0, 0), p, font=f_hash)
        pw2 = pb[2] - pb[0]
        draw.text((px + 40, 756), p, font=f_hash, fill='#070f0c', anchor='mm')
        px += pw + 12

    # ── CTA ────────────────────────────────────────────────────────────────
    draw.text((W // 2, 845), 'Inscrições Abertas!', font=f_cta, fill='#1D9E75', anchor='mm')

    # ── Link destacado ─────────────────────────────────────────────────────
    link_text = 'itatecnologiaeducacional.tech/desafio'
    lb = draw.textbbox((0, 0), link_text, font=f_link)
    lw = lb[2] - lb[0]
    lx = (W - lw) // 2
    # Fundo escuro semi-transparente para o link
    draw.rounded_rectangle(
        [lx - 24, 885, lx + lw + 24, 885 + 50],
        radius=12, fill='#1D9E75'
    )
    draw.text((W // 2, 910), link_text, font=f_link, fill='#FFFFFF', anchor='mm')

    # ── Hashtags ──────────────────────────────────────────────────────────
    draw.text((W // 2, 980), '#DiadoDesafio  #CEITEC  #Itapipoca', font=f_hash, fill='#4a7a62', anchor='mm')

    # ── Instagram ─────────────────────────────────────────────────────────
    draw.text((W // 2, 1030), '@ceitecitapipoca', font=f_hash, fill='#2d5040', anchor='mm')

    buffer = io.BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)

    response = HttpResponse(buffer.read(), content_type='image/png')
    response['Content-Disposition'] = 'attachment; filename=banner_dia_do_desafio.png'
    return response

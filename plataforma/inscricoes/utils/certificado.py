import io
from datetime import date as date_type

MESES = {
    1: 'janeiro', 2: 'fevereiro', 3: 'março', 4: 'abril',
    5: 'maio', 6: 'junho', 7: 'julho', 8: 'agosto',
    9: 'setembro', 10: 'outubro', 11: 'novembro', 12: 'dezembro',
}


def _data_emissao(inscricao):
    d = inscricao.data_certificado or date_type.today()
    # date_type.today() retorna date; data_certificado é datetime — normaliza
    if hasattr(d, 'date'):
        d = d.date()
    return f'{d.day} de {MESES[d.month]} de {d.year}'


def gerar_certificado_svg(inscricao):
    nome = inscricao.nome_completo.upper()
    codigo = inscricao.codigo_curto()
    curso = 'ALUNOS MAKER NÃO TIRAM FÉRIAS'
    carga = '40 horas'
    data_emissao = _data_emissao(inscricao)

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="1123" height="794" viewBox="0 0 1123 794"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Space+Grotesk:wght@300;400;600&amp;display=swap');
    </style>
    <pattern id="pcb" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
      <rect width="60" height="60" fill="none"/>
      <circle cx="10" cy="10" r="2" fill="#F5A62322"/>
      <circle cx="50" cy="50" r="2" fill="#F5A62322"/>
      <line x1="10" y1="10" x2="50" y2="10" stroke="#F5A62314" stroke-width="1"/>
      <line x1="50" y1="10" x2="50" y2="50" stroke="#F5A62314" stroke-width="1"/>
      <circle cx="30" cy="30" r="1.5" fill="#F5A62218"/>
    </pattern>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F5A62310"/>
      <stop offset="100%" stop-color="#0A0E1A00"/>
    </radialGradient>
  </defs>

  <rect width="1123" height="794" fill="#0A0E1A"/>
  <rect width="1123" height="794" fill="url(#pcb)"/>
  <ellipse cx="561" cy="397" rx="520" ry="360" fill="url(#glow)"/>

  <rect x="18" y="18" width="1087" height="758" rx="14"
        fill="none" stroke="#F5A623" stroke-width="2" opacity="0.65"/>
  <rect x="28" y="28" width="1067" height="738" rx="9"
        fill="none" stroke="#F5A623" stroke-width="0.5" opacity="0.3"/>

  <g stroke="#F5A623" stroke-width="2.5" fill="none" opacity="0.85">
    <polyline points="18,68 18,18 68,18"/>
    <circle cx="42" cy="42" r="7" fill="#F5A62330" stroke="#F5A62380" stroke-width="1"/>
    <polyline points="1105,68 1105,18 1055,18"/>
    <circle cx="1081" cy="42" r="7" fill="#F5A62330" stroke="#F5A62380" stroke-width="1"/>
    <polyline points="18,726 18,776 68,776"/>
    <circle cx="42" cy="752" r="7" fill="#F5A62330" stroke="#F5A62380" stroke-width="1"/>
    <polyline points="1105,726 1105,776 1055,776"/>
    <circle cx="1081" cy="752" r="7" fill="#F5A62330" stroke="#F5A62380" stroke-width="1"/>
  </g>

  <line x1="18" y1="130" x2="1105" y2="130" stroke="#F5A623" stroke-width="0.5" opacity="0.35"/>
  <line x1="18" y1="664" x2="1105" y2="664" stroke="#F5A623" stroke-width="0.5" opacity="0.25"/>

  <text x="561" y="68" font-family="'Bebas Neue', sans-serif"
        font-size="26" fill="#F5A623" text-anchor="middle" letter-spacing="7">
    CEITEC — CENTRO EDUCACIONAL DE INOVAÇÃO E TECNOLOGIA
  </text>
  <text x="561" y="94" font-family="'Space Grotesk', sans-serif"
        font-size="12" fill="#8A95B5" text-anchor="middle" letter-spacing="4">
    ITA TECNOLOGIA EDUCACIONAL · ITAPIPOCA · CEARÁ · BRASIL
  </text>

  <text x="561" y="172" font-family="'Space Grotesk', sans-serif"
        font-size="13" fill="#8A95B5" text-anchor="middle" letter-spacing="6">
    CERTIFICADO DE CONCLUSÃO
  </text>
  <line x1="220" y1="182" x2="903" y2="182"
        stroke="#F5A623" stroke-width="1" opacity="0.5"/>

  <text x="561" y="232" font-family="'Space Grotesk', sans-serif"
        font-size="15" fill="#8A95B5" text-anchor="middle" font-style="italic">
    certifica que
  </text>

  <text x="561" y="308" font-family="'Bebas Neue', sans-serif"
        font-size="60" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">
    {nome}
  </text>
  <line x1="120" y1="322" x2="1003" y2="322"
        stroke="#F5A623" stroke-width="1.5" opacity="0.7"/>

  <text x="561" y="366" font-family="'Space Grotesk', sans-serif"
        font-size="15" fill="#8A95B5" text-anchor="middle">
    concluiu com êxito o curso intensivo
  </text>

  <text x="561" y="428" font-family="'Bebas Neue', sans-serif"
        font-size="44" fill="#F5A623" text-anchor="middle" letter-spacing="2">
    {curso}
  </text>

  <text x="561" y="466" font-family="'Space Grotesk', sans-serif"
        font-size="14" fill="#8A95B5" text-anchor="middle">
    Robótica Educacional · Arduino · ESP32 · IoT · Eletrônica · Cultura Maker
  </text>

  <text x="561" y="494" font-family="'Space Grotesk', sans-serif"
        font-size="13" fill="#8A95B560" text-anchor="middle">
    Julho de 2026 · Itapipoca, Ceará
  </text>

  <rect x="190" y="530" width="200" height="70" rx="8"
        fill="#F5A62308" stroke="#F5A62330" stroke-width="1"/>
  <text x="290" y="568" font-family="'Bebas Neue', sans-serif"
        font-size="38" fill="#F5A623" text-anchor="middle">{carga}</text>
  <text x="290" y="590" font-family="'Space Grotesk', sans-serif"
        font-size="11" fill="#8A95B5" text-anchor="middle" letter-spacing="2">
    CARGA HORÁRIA
  </text>

  <line x1="561" y1="535" x2="561" y2="600"
        stroke="#F5A62340" stroke-width="1"/>

  <rect x="733" y="530" width="200" height="70" rx="8"
        fill="#F5A62308" stroke="#F5A62330" stroke-width="1"/>
  <text x="833" y="566" font-family="'Space Grotesk', sans-serif"
        font-size="14" fill="#F0F4FF" text-anchor="middle" font-weight="600">
    {data_emissao}
  </text>
  <text x="833" y="590" font-family="'Space Grotesk', sans-serif"
        font-size="11" fill="#8A95B5" text-anchor="middle" letter-spacing="2">
    DATA DE EMISSÃO
  </text>

  <line x1="160" y1="688" x2="440" y2="688" stroke="#F5A62360" stroke-width="1"/>
  <text x="300" y="706" font-family="'Space Grotesk', sans-serif"
        font-size="13" fill="#F0F4FF" text-anchor="middle" font-weight="600">
    Genezio de Lavor
  </text>
  <text x="300" y="722" font-family="'Space Grotesk', sans-serif"
        font-size="11" fill="#8A95B5" text-anchor="middle">
    Coordenador — CEITEC · Itapipoca
  </text>

  <line x1="683" y1="688" x2="963" y2="688" stroke="#F5A62360" stroke-width="1"/>
  <text x="823" y="706" font-family="'Space Grotesk', sans-serif"
        font-size="13" fill="#F0F4FF" text-anchor="middle" font-weight="600">
    ITA Tecnologia Educacional
  </text>
  <text x="823" y="722" font-family="'Space Grotesk', sans-serif"
        font-size="11" fill="#8A95B5" text-anchor="middle">
    Plataforma Certificadora
  </text>

  <text x="561" y="762" font-family="'Space Grotesk', sans-serif"
        font-size="11" fill="#8A95B5" text-anchor="middle" letter-spacing="0.5">
    Código: {codigo} · Verifique em: itatecnologiaeducacional.tech/inscricao/verificar/{codigo}
  </text>

</svg>'''
    return svg


def gerar_certificado_pdf(inscricao):
    """
    Gera o certificado em PDF usando reportlab.
    Design profissional dark com elementos maker/tech.
    """
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.lib.units import mm

    BG = HexColor('#0A0E1A')
    ORANGE = HexColor('#F5A623')
    MUTED = HexColor('#8A95B5')
    TEXT = HexColor('#F0F4FF')
    TEXT2 = HexColor('#C8D0E8')
    GREEN = HexColor('#22C55E')
    DARK_CARD = HexColor('#0D1525')

    buffer = io.BytesIO()
    W, H = landscape(A4)  # 841.89 x 595.28 pts
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    # ── Fundo ────────────────────────────────────────────────────────────────
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Padrão de pontos PCB (grade)
    c.setFillColor(HexColor('#F5A62320'))
    for x in range(0, int(W), 60):
        for y in range(0, int(H), 60):
            c.circle(x + 10, y + 10, 2, fill=1, stroke=0)

    # ── Borda laranja ────────────────────────────────────────────────────────
    c.setStrokeColor(ORANGE)
    c.setLineWidth(2)
    c.setFillColor(HexColor('#00000000'))
    c.roundRect(14, 14, W - 28, H - 28, 10, fill=0, stroke=1)

    # Borda interna fina
    c.setStrokeColor(HexColor('#F5A62330'))
    c.setLineWidth(0.5)
    c.roundRect(22, 22, W - 44, H - 44, 7, fill=0, stroke=1)

    # ── Cantos decorativos ───────────────────────────────────────────────────
    c.setStrokeColor(ORANGE)
    c.setLineWidth(2.5)
    # canto inf-esq (PDF y começa de baixo)
    for (x1, y1, x2, y2) in [
        (14, H - 50, 14, H - 14),   # vertical topo esq
        (14, H - 14, 50, H - 14),   # horizontal topo esq
        (W - 50, H - 14, W - 14, H - 14),  # horizontal topo dir
        (W - 14, H - 50, W - 14, H - 14),  # vertical topo dir
        (14, 14, 50, 14),            # horizontal base esq
        (14, 14, 14, 50),            # vertical base esq
        (W - 50, 14, W - 14, 14),   # horizontal base dir
        (W - 14, 14, W - 14, 50),   # vertical base dir
    ]:
        c.line(x1, y1, x2, y2)

    # Círculos nos cantos
    c.setFillColor(HexColor('#F5A62330'))
    c.setStrokeColor(HexColor('#F5A62380'))
    c.setLineWidth(1)
    for (cx, cy) in [(30, H - 30), (W - 30, H - 30), (30, 30), (W - 30, 30)]:
        c.circle(cx, cy, 7, fill=1, stroke=1)

    # ── Linhas decorativas horizontais ───────────────────────────────────────
    c.setStrokeColor(HexColor('#F5A62350'))
    c.setLineWidth(0.5)
    c.line(14, H - 95, W - 14, H - 95)
    c.line(14, 100, W - 14, 100)

    # ── CABEÇALHO ────────────────────────────────────────────────────────────
    c.setFillColor(ORANGE)
    c.setFont('Helvetica-Bold', 20)
    c.drawCentredString(W / 2, H - 52, 'CEITEC — CENTRO EDUCACIONAL DE INOVAÇÃO E TECNOLOGIA')

    c.setFillColor(MUTED)
    c.setFont('Helvetica', 9)
    c.drawCentredString(W / 2, H - 68, 'ITA TECNOLOGIA EDUCACIONAL  ·  ITAPIPOCA  ·  CEARÁ  ·  BRASIL')

    # ── CORPO ────────────────────────────────────────────────────────────────
    # Label "CERTIFICADO DE CONCLUSÃO"
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 10)
    c.drawCentredString(W / 2, H - 130, 'C  E  R  T  I  F  I  C  A  D  O    D  E    C  O  N  C  L  U  S  Ã  O')

    # Linha decorativa
    c.setStrokeColor(HexColor('#F5A62380'))
    c.setLineWidth(1)
    c.line(160, H - 140, W - 160, H - 140)

    # "certifica que"
    c.setFillColor(MUTED)
    c.setFont('Helvetica-Oblique', 12)
    c.drawCentredString(W / 2, H - 176, 'certifica que')

    # NOME DO ALUNO
    nome = inscricao.nome_completo.upper()
    c.setFillColor(TEXT)
    c.setFont('Helvetica-Bold', 42)
    # Ajusta tamanho se nome for muito longo
    while c.stringWidth(nome, 'Helvetica-Bold', 42) > W - 120 and 42 > 22:
        pass
    nome_fs = 42
    while c.stringWidth(nome, 'Helvetica-Bold', nome_fs) > W - 100:
        nome_fs -= 2
    c.setFont('Helvetica-Bold', nome_fs)
    c.drawCentredString(W / 2, H - 230, nome)

    # Linha dourada sob o nome
    c.setStrokeColor(ORANGE)
    c.setLineWidth(1.5)
    c.line(80, H - 240, W - 80, H - 240)

    # "concluiu com êxito"
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 12)
    c.drawCentredString(W / 2, H - 268, 'concluiu com êxito o curso intensivo')

    # NOME DO CURSO
    c.setFillColor(ORANGE)
    c.setFont('Helvetica-Bold', 32)
    c.drawCentredString(W / 2, H - 314, 'ALUNOS MAKER NÃO TIRAM FÉRIAS')

    # Disciplinas
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 11)
    c.drawCentredString(W / 2, H - 338, 'Robótica Educacional · Arduino · ESP32 · IoT · Eletrônica · Cultura Maker')

    # Período
    c.setFillColor(HexColor('#8A95B590'))
    c.setFont('Helvetica', 10)
    c.drawCentredString(W / 2, H - 358, 'Julho de 2026 · Itapipoca, Ceará')

    # ── BLOCOS DE DADOS ───────────────────────────────────────────────────────
    # Bloco carga horária (esquerda)
    bx1, by, bw, bh = 130, 130, 160, 55
    c.setFillColor(HexColor('#F5A62308'))
    c.setStrokeColor(HexColor('#F5A62330'))
    c.setLineWidth(1)
    c.roundRect(bx1, by, bw, bh, 6, fill=1, stroke=1)

    c.setFillColor(ORANGE)
    c.setFont('Helvetica-Bold', 28)
    c.drawCentredString(bx1 + bw / 2, by + 34, '40 horas')
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 8)
    c.drawCentredString(bx1 + bw / 2, by + 16, 'C A R G A   H O R Á R I A')

    # Bloco data de emissão (direita)
    bx2 = W - 130 - bw
    c.setFillColor(HexColor('#F5A62308'))
    c.setStrokeColor(HexColor('#F5A62330'))
    c.setLineWidth(1)
    c.roundRect(bx2, by, bw, bh, 6, fill=1, stroke=1)

    data_str = _data_emissao(inscricao)
    c.setFillColor(TEXT)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(bx2 + bw / 2, by + 34, data_str)
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 8)
    c.drawCentredString(bx2 + bw / 2, by + 16, 'D A T A   D E   E M I S S Ã O')

    # Divisor central
    c.setStrokeColor(HexColor('#F5A62340'))
    c.setLineWidth(1)
    c.line(W / 2, 130, W / 2, 185)

    # ── ASSINATURAS ──────────────────────────────────────────────────────────
    # Assinatura esquerda
    ax1 = 120
    aw = 230
    ay = 80
    c.setStrokeColor(HexColor('#F5A62360'))
    c.setLineWidth(1)
    c.line(ax1, ay + 20, ax1 + aw, ay + 20)

    c.setFillColor(TEXT)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(ax1 + aw / 2, ay + 10, 'Genezio de Lavor')
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 9)
    c.drawCentredString(ax1 + aw / 2, ay - 2, 'Coordenador — CEITEC · Itapipoca')

    # Assinatura direita
    ax2 = W - 120 - aw
    c.setStrokeColor(HexColor('#F5A62360'))
    c.line(ax2, ay + 20, ax2 + aw, ay + 20)

    c.setFillColor(TEXT)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(ax2 + aw / 2, ay + 10, 'ITA Tecnologia Educacional')
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 9)
    c.drawCentredString(ax2 + aw / 2, ay - 2, 'Plataforma Certificadora')

    # ── RODAPÉ DE VERIFICAÇÃO ────────────────────────────────────────────────
    codigo = inscricao.codigo_curto()
    c.setFillColor(MUTED)
    c.setFont('Helvetica', 8)
    c.drawCentredString(
        W / 2, 24,
        f'Código: {codigo}  ·  Verifique em: itatecnologiaeducacional.tech/inscricao/verificar/{codigo}'
    )

    c.save()
    return buffer.getvalue()

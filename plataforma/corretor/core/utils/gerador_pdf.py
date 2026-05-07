import io
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def gerar_gabarito_pdf(avaliacao, quantidade=4, alunos=None):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    largura, altura = A4

    alternativas = ['A', 'B', 'C', 'D', 'E'][:avaliacao.alternativas_por_questao]
    num_questoes = avaliacao.numero_questoes

    lista_itens = alunos if alunos else range(quantidade)

    for idx, item in enumerate(lista_itens):
        nome_aluno = ""
        qr_data = f"AVAL-{avaliacao.id}"

        if idx > 0 and idx % 4 == 0:
            c.showPage()

        col = idx % 2
        row = (idx // 2) % 2

        if hasattr(item, 'nome'):
            nome_aluno = item.nome
            # Codificação Segura: AVAL-id-ALUNO-id-NOME-nome
            qr_data = f"AVAL-{avaliacao.id}-ALUNO-{item.id}-NOME-{nome_aluno}"

        # Coordenadas do card (4 por pagina A4)
        x_base = col * largura / 2
        y_base = altura - (row + 1) * altura / 2
        card_w = largura / 2 - 40
        card_h = altura / 2 - 40

        # Borda do card
        c.rect(x_base + 20, y_base + 20, card_w, card_h)

        # QR Code
        qr = qrcode.QRCode(version=1, box_size=4, border=1)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_buf = io.BytesIO()
        qr_img.save(qr_buf, format='PNG')
        qr_buf.seek(0)
        c.drawImage(ImageReader(qr_buf), x_base + 25, y_base + card_h - 48, width=45, height=45)

        # Titulo e infos
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x_base + 75, y_base + card_h - 15, avaliacao.titulo[:30].upper())
        c.setFont("Helvetica", 7)
        c.drawString(x_base + 75, y_base + card_h - 26, f"DISC: {avaliacao.disciplina[:20]}")
        # V52: Prioriza a turma do aluno no PDF nominal
        exibir_turma = item.turma if hasattr(item, 'turma') else avaliacao.turma
        c.drawString(x_base + 75, y_base + card_h - 36, f"TURMA: {exibir_turma}")

        # Nome e turma
        c.setFont("Helvetica", 8)
        nome_display = nome_aluno if nome_aluno else "_" * 30
        c.drawString(x_base + 25, y_base + card_h - 58, f"NOME: {nome_display}")
        c.drawString(x_base + 25, y_base + card_h - 70, f"TURMA: {exibir_turma}")

        # === LINHA MARCADORA (PRETA E SOLIDA) ===
        # Esta linha serve como referencia para o leitor saber onde comecam os circulos
        # O leitor V24 procura esta linha para calibrar o inicio da grade
        LINHA_MARCADORA_Y = y_base + card_h - 82
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(2)
        c.line(x_base + 22, LINHA_MARCADORA_Y, x_base + card_w + 18, LINHA_MARCADORA_Y)
        c.setLineWidth(1)

        # Cabecalho das alternativas
        colunas_q = 2 if num_questoes > 15 else 1
        questoes_por_col = (num_questoes + 1) // 2 if colunas_q == 2 else num_questoes
        espacamento_y = 16 if num_questoes > 20 else 20

        y_header = LINHA_MARCADORA_Y - 10
        
        for col_q in range(colunas_q):
            x_col = x_base + 30 + col_q * int(card_w / colunas_q + 5)
            c.setFont("Helvetica-Bold", 8)
            for j, alt in enumerate(alternativas):
                c.drawCentredString(x_col + 38 + j * 16, y_header, alt)

            # Grade de circulos
            c.setFont("Helvetica", 7)
            inicio = col_q * questoes_por_col + 1
            fim = min((col_q + 1) * questoes_por_col + 1, num_questoes + 1)
            for q in range(inicio, fim):
                y_lin = y_header - 12 - (q - inicio) * espacamento_y
                c.drawRightString(x_col + 28, y_lin, f"{q})")
                for j in range(len(alternativas)):
                    c.circle(x_col + 38 + j * 16, y_lin + 3, 5, stroke=1, fill=0)

    c.save()
    buffer.seek(0)
    return buffer.getvalue(), []

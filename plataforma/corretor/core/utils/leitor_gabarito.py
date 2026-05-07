"""
LeitorGabarito Final (V24 - Algoritmo Certo)

PROBLEMA RAIZ DOS BUGS ANTERIORES:
- _localizar_grid usava getbbox() que recortava O GABARITO INTEIRO (QR code, nome, questoes)
- A grade depois era dividida sobre essa area total, errando a mira dos circulos

SOLUCAO V24:
- NAO fazer auto-crop generica que pega areas erradas
- Assumir que a imagem recebida do canvas JS ja e a foto da folha
- Dividir a imagem em zonas: cabecalho (30%) + area de respostas (70%)
- Na area de respostas, criar a grade e ler os circulos
- Usar analise de LINHA: o circulo marcado e o UNICO muito mais escuro que os outros
- Adicionar logs de debug para facilitar diagnostico
"""
from PIL import Image, ImageOps
import io
import logging

logger = logging.getLogger(__name__)


class LeitorGabarito:
    """
    Leitor de gabarito V24 - Robusto e Preciso.
    Assume que a imagem completa da folha e recebida.
    Localiza a area de respostas (parte inferior da folha) e le os circulos.
    """
    
    def __init__(self, numero_questoes=10, alternativas_por_questao=4):
        self.numero_questoes = int(numero_questoes)
        self.alternativas_por_questao = int(alternativas_por_questao)
        self.alternativas = ['A', 'B', 'C', 'D', 'E'][:self.alternativas_por_questao]
    
    def processar_imagem(self, imagem_path):
        try:
            img = self._carregar_imagem(imagem_path)
            img_respostas = self._extrair_area_respostas(img)
            respostas = self._detectar_respostas(img_respostas)
            
            logger.debug(f"V24 detectou respostas: {respostas}")
            
            return {'sucesso': True, 'respostas': respostas}
        except Exception as e:
            logger.error(f"Erro no LeitorGabarito V24: {e}")
            return {'sucesso': False, 'erro': str(e), 'respostas': {}}
    
    def _carregar_imagem(self, imagem_path):
        if hasattr(imagem_path, 'convert'):
            return imagem_path.convert('RGB')
        if isinstance(imagem_path, str):
            return Image.open(imagem_path).convert('RGB')
        elif hasattr(imagem_path, 'read'):
            return Image.open(imagem_path).convert('RGB')
        elif isinstance(imagem_path, bytes):
            return Image.open(io.BytesIO(imagem_path)).convert('RGB')
        raise ValueError("Tipo de imagem invalido")

    def _extrair_area_respostas(self, img):
        """
        Localiza a linha marcadora preta para alinhar o topo da area de respostas.
        V51: Busca robusta com amostragem densa e fallback inteligente.
        """
        w, h = img.size
        img_gray = img.convert('L')
        pixels = list(img_gray.getdata())
        
        # Procurar linha preta horizontal entre 25% e 55% da altura
        linha_detectada = int(h * 0.40) # Fallback V51
        max_preto = 0
        
        # Amostragem mais densa para não perder a linha
        for y in range(int(h * 0.25), int(h * 0.55), 1):
            preto_count = 0
            # Amostra pontos ao longo da largura (de 20% a 80%)
            for x in range(int(w * 0.2), int(w * 0.8), 2):
                if pixels[y * w + x] < 100: # Tom escuro calibrado
                    preto_count += 1
            
            # A linha marcadora deve cobrir pelo menos 25% da largura amostrada
            # O PDF gera uma linha bem longa, então deve ser fácil de achar
            if preto_count > (w * 0.2) and preto_count > max_preto:
                max_preto = preto_count
                linha_detectada = y
        
        # O PDF coloca as questoes um pouco abaixo da linha marcadora
        # Deixa uma margem de segurança de 10 pixels
        topo = linha_detectada + 10
        area = img.crop((0, topo, w, h))
        return area

    def _detectar_respostas(self, img):
        """
        V50: Scanner de Comparação Local (Antissombra).
        Em vez de um limiar fixo, compara as 4 alternativas entre si.
        O círculo proeminente (mais escuro que a média da linha) é o marcado.
        """
        w, h = img.size
        # Normalização de contraste para destacar marcações
        img_gray = img.convert('L')
        img_gray = ImageOps.autocontrast(img_gray, cutoff=1)
        
        # Calibração V60: Alinhamento Geométrico com o PDF (GPS-Accurate)
        # O PDF imprime a Q1 a exatos 22pts abaixo da linha marcadora.
        start_x_pct = 0.185
        step_x_pct = 0.065
        start_y_pct = 0.058 # AJUSTE CRÍTICO V60: +7 pixels de precisão
        step_y_pct = 0.067
        
        # Área de busca (maior para capturar o círculo todo)
        r = int(w * 0.018) 
        
        respostas = {}
        for q in range(self.numero_questoes):
            y_base = int(h * (start_y_pct + q * step_y_pct))
            if y_base >= h: break
            
            intensidades = []
            for a in range(self.alternativas_por_questao):
                x_base = int(w * (start_x_pct + a * step_x_pct))
                
                # Coleta a intensidade média do miolo do círculo
                box = (x_base - r, y_base - r, x_base + r, y_base + r)
                sub = img_gray.crop(box)
                pixels = list(sub.getdata())
                if pixels:
                    # Usamos a média dos pixels mais escuros (percentil 25) para ser robusto
                    ordem = sorted(pixels)
                    quarto = ordem[:max(1, len(ordem)//4)]
                    media = sum(quarto) / len(quarto)
                    intensidades.append(media)
                else:
                    intensidades.append(255)
            
            if not intensidades: continue

            # --- V50: LÓGICA DE COMPARAÇÃO LOCAL ---
            val_min = min(intensidades)
            idx_min = intensidades.index(val_min)
            
            # Compara o mais escuro com a média dos outros 3
            outros = [v for i, v in enumerate(intensidades) if i != idx_min]
            media_outros = sum(outros) / len(outros) if outros else 255
            
            # Se o círculo for pelo menos 20% mais escuro que a média da linha, consideramos marcado
            # Isso anula o efeito de sombras que escurecem a linha toda de forma igual.
            diferenca = media_outros - val_min
            
            if val_min < 200 and diferenca > 25:
                respostas[str(q + 1)] = self.alternativas[idx_min]
                logger.debug(f"Q{q+1}: Detectado {self.alternativas[idx_min]} (Diff={diferenca})")
            else:
                logger.debug(f"Q{q+1}: Indefinido (Min={val_min}, Outros={media_outros})")
        
        return respostas
    
    def corrigir(self, respostas_aluno, gabarito_oficial):
        acertos = 0
        erros = 0
        nao_marcadas = 0
        total = len(gabarito_oficial)
        respostas_corrigidas = {}
        
        for q_id, alt_correta in gabarito_oficial.items():
            questao = str(q_id)
            resp = respostas_aluno.get(questao, '')
            
            if not resp:
                nao_marcadas += 1
                erros += 1 # Contar branca como erro para bater a soma total
                status = 'nao_marcada'
            elif resp == str(alt_correta):
                acertos += 1
                status = 'correto'
            else:
                erros += 1
                status = 'errado'
            
            respostas_corrigidas[questao] = {
                'marcada': resp or '-',
                'correta': str(alt_correta),
                'status': status
            }
        
        nota = round((acertos / total) * 10, 2) if total > 0 else 0
        
        return {
            'acertos': acertos,
            'erros': erros,
            'nao_marcadas': nao_marcadas,
            'nota': nota,
            'total': total,
            'respostas': respostas_corrigidas
        }


def processar_upload(imagem_file, numero_questoes, alternativas, gabarito):
    g_limpo = {str(k): str(v) for k, v in gabarito.items()}
    leitor = LeitorGabarito(numero_questoes, alternativas)
    res = leitor.processar_imagem(imagem_file)
    
    if not res['sucesso']:
        return {'sucesso': False, 'erro': res['erro']}
    
    corr = leitor.corrigir(res['respostas'], g_limpo)
    return {'sucesso': True, 'respostas_detectadas': res['respostas'], **corr}

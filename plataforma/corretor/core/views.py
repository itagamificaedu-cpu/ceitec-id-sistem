import json
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count, Max, Min
from django.db.models import Prefetch
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import datetime
from openpyxl import Workbook
import csv
from django.contrib.auth import get_user_model
from .models import Avaliacao, Resultado, Estatisticas, Aluno, AlunoITA
from .forms import AvaliacaoForm, CorrecaoForm
Usuario = get_user_model()
from .utils.leitor_gabarito import processar_upload
from .utils.gerador_pdf import gerar_gabarito_pdf
from .utils.helpers import normalizar_turma, turmas_compativeis

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Importação de Alunos
# ---------------------------------------------------------------------------

@login_required
def importar_alunos_view(request):
    # Importacao via CSV desativada - alunos vem diretamente do sistema ITA
    if request.method == 'POST':
        messages.info(request, 'Os alunos sao gerenciados pelo sistema ITA. Cadastre-os la.')
        return redirect('importar_alunos')

    alunos = AlunoITA.objects.filter(ativo=1)

    q_nome = request.GET.get('q_nome', '')
    q_turma = request.GET.get('q_turma', '')
    if q_nome:
        alunos = alunos.filter(nome__icontains=q_nome)
    if q_turma:
        alunos = alunos.filter(turma__icontains=q_turma)

    paginator = Paginator(alunos, 50)
    page = request.GET.get('page', 1)
    alunos_page = paginator.get_page(page)

    return render(request, 'core/importar_alunos.html', {
        'alunos': alunos_page,
        'q_nome': q_nome,
        'q_turma': q_turma,
        'sincronizado_ita': True,
    })


# ---------------------------------------------------------------------------
# Autenticação
# ---------------------------------------------------------------------------

def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('home')
        else:
            messages.error(request, 'Usuário ou senha inválidos.')

    return render(request, 'registration/login.html')


def logout_view(request):
    logout(request)
    return redirect('login')


def registro_view(request):
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        from gamificaedu.accounts.forms import CadastroForm as UsuarioCreationForm
        form = UsuarioCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Conta criada com sucesso!')
            return redirect('home')
    else:
        from gamificaedu.accounts.forms import CadastroForm as UsuarioCreationForm
        form = UsuarioCreationForm()

    return render(request, 'registration/registro.html', {'form': form})


# ---------------------------------------------------------------------------
# Home
# ---------------------------------------------------------------------------

@login_required
def home(request):
    avaliacoes_qs = Avaliacao.objects.filter(professor=request.user)
    correcoes_qs = Resultado.objects.filter(avaliacao__professor=request.user)

    context = {
        'total_avaliacoes': avaliacoes_qs.count(),
        'total_correcoes': correcoes_qs.count(),
        'avaliacoes_recentes': avaliacoes_qs.order_by('-data_criacao')[:5],
        'ultimas_correcoes': correcoes_qs.order_by('-data_correcao')[:5],
    }
    return render(request, 'core/home.html', context)


# ---------------------------------------------------------------------------
# Avaliações
# ---------------------------------------------------------------------------

@login_required
def lista_avaliacoes(request):
    avaliacoes = Avaliacao.objects.filter(professor=request.user)

    filtro_status = request.GET.get('status')
    filtro_disciplina = request.GET.get('disciplina')

    if filtro_status:
        avaliacoes = avaliacoes.filter(status=filtro_status)
    if filtro_disciplina:
        avaliacoes = avaliacoes.filter(disciplina__icontains=filtro_disciplina)

    paginator = Paginator(avaliacoes, 20)
    page = request.GET.get('page', 1)
    avaliacoes_page = paginator.get_page(page)

    return render(request, 'avaliacoes/lista.html', {
        'avaliacoes': avaliacoes_page,
        'filtro_status': filtro_status,
        'filtro_disciplina': filtro_disciplina,
    })


@login_required
def criar_avaliacao(request):
    if request.method == 'POST':
        titulo = request.POST.get('titulo', '').strip()
        instituicao = request.POST.get('instituicao', '').strip()
        disciplina = request.POST.get('disciplina', '').strip()
        serie = request.POST.get('serie', '').strip()
        turma = request.POST.get('turma', '').strip()
        data_aplicacao_str = request.POST.get('data_aplicacao')
        status = request.POST.get('status', 'publicada')
        is_manual = request.POST.get('is_manual') == 'on'
        is_online = request.POST.get('is_online') == 'on'
        arquivo_prova = request.FILES.get('arquivo_prova')

        try:
            numero_questoes = int(request.POST.get('numero_questoes', 10))
            numero_questoes = max(1, min(numero_questoes, 500))
        except (ValueError, TypeError):
            numero_questoes = 10

        try:
            alternativas = int(request.POST.get('alternativas_por_questao', 5))
            alternativas = max(2, min(alternativas, 10))
        except (ValueError, TypeError):
            alternativas = 5

        gabarito_json = request.POST.get('gabarito_json', '')
        try:
            gabarito = json.loads(gabarito_json) if gabarito_json else {}
        except json.JSONDecodeError:
            gabarito = {}

        data_aplicacao_obj = None
        if data_aplicacao_str:
            try:
                data_aplicacao_obj = datetime.strptime(data_aplicacao_str, '%Y-%m-%d').date()
            except ValueError:
                data_aplicacao_obj = timezone.now().date()

        avaliacao = Avaliacao.objects.create(
            titulo=titulo,
            instituicao=instituicao,
            professor=request.user,
            disciplina=disciplina,
            serie=serie,
            turma=turma,
            arquivo_prova=arquivo_prova,
            data_aplicacao=data_aplicacao_obj,
            numero_questoes=numero_questoes,
            alternativas_por_questao=alternativas,
            gabarito=gabarito,
            status=status,
            is_manual=is_manual,
            is_online=is_online,
        )

        messages.success(request, 'Avaliação criada com sucesso!')
        return redirect('lista_avaliacoes')

    turmas_existentes = (
        AlunoITA.objects.filter(ativo=1)
        .values_list('turma', flat=True)
        .distinct()
        .order_by('turma')
    )
    return render(request, 'avaliacoes/criar.html', {'turmas_existentes': turmas_existentes})


@login_required
def editar_avaliacao(request, pk):
    avaliacao = get_object_or_404(Avaliacao, pk=pk, professor=request.user)

    if request.method == 'POST':
        avaliacao.titulo = request.POST.get('titulo', '').strip()
        avaliacao.instituicao = request.POST.get('instituicao', '').strip()
        avaliacao.disciplina = request.POST.get('disciplina', '').strip()
        avaliacao.serie = request.POST.get('serie', '').strip()
        avaliacao.turma = request.POST.get('turma', '').strip()
        avaliacao.status = request.POST.get('status', 'publicada')
        avaliacao.is_manual = request.POST.get('is_manual') == 'on'
        avaliacao.is_online = request.POST.get('is_online') == 'on'

        data_aplicacao_str = request.POST.get('data_aplicacao')
        if data_aplicacao_str:
            try:
                avaliacao.data_aplicacao = datetime.strptime(data_aplicacao_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        try:
            n_questoes = int(request.POST.get('numero_questoes', 10))
            avaliacao.numero_questoes = max(1, min(n_questoes, 500))
        except (ValueError, TypeError):
            pass

        try:
            n_alts = int(request.POST.get('alternativas_por_questao', 5))
            avaliacao.alternativas_por_questao = max(2, min(n_alts, 10))
        except (ValueError, TypeError):
            pass

        g_json = request.POST.get('gabarito_json', '')
        if g_json:
            try:
                avaliacao.gabarito = json.loads(g_json)
            except json.JSONDecodeError:
                messages.warning(request, 'Gabarito JSON inválido — mantido o anterior.')

        arquivo_prova = request.FILES.get('arquivo_prova')
        if arquivo_prova:
            avaliacao.arquivo_prova = arquivo_prova

        avaliacao.save()
        messages.success(request, 'Avaliação atualizada com sucesso!')
        return redirect('lista_avaliacoes')

    turmas_existentes = (
        AlunoITA.objects.filter(ativo=1)
        .values_list('turma', flat=True)
        .distinct()
        .order_by('turma')
    )
    return render(request, 'avaliacoes/editar.html', {
        'avaliacao': avaliacao,
        'turmas_existentes': turmas_existentes,
    })


@login_required
def detalhar_avaliacao(request, pk):
    avaliacao = get_object_or_404(Avaliacao, pk=pk, professor=request.user)
    _alunos_ita = list(AlunoITA.objects.filter(ativo=1).order_by('nome'))
    alunos = [a for a in _alunos_ita if turmas_compativeis(a.turma, avaliacao.turma)]
    resultados = avaliacao.resultados.all()

    stats = resultados.aggregate(
        media=Avg('nota'),
        maior=Max('nota'),
        menor=Min('nota'),
        total=Count('id'),
    )

    return render(request, 'avaliacoes/detalhar.html', {
        'avaliacao': avaliacao,
        'alunos': alunos,
        'resultados': resultados,
        'media': stats['media'] or 0,
        'maior': stats['maior'] or 0,
        'menor': stats['menor'] or 0,
        'total': stats['total'] or 0,
    })


@login_required
def excluir_avaliacao(request, pk):
    avaliacao = get_object_or_404(Avaliacao, pk=pk, professor=request.user)

    if request.method == 'POST':
        avaliacao.delete()
        messages.success(request, 'Avaliação excluída com sucesso!')
        return redirect('lista_avaliacoes')

    return render(request, 'avaliacoes/excluir.html', {'avaliacao': avaliacao})


# ---------------------------------------------------------------------------
# PDF / QR
# ---------------------------------------------------------------------------

@login_required
def gerar_pdf(request, pk):
    avaliacao = get_object_or_404(Avaliacao, id=pk, professor=request.user)

    nominal = request.GET.get('nominal') == '1'
    aluno_id = request.GET.get('aluno_id')

    alunos = None
    if aluno_id:
        alunos = list(AlunoITA.objects.filter(id=aluno_id))
    elif nominal:
        todos_alunos = list(
            AlunoITA.objects.filter(ativo=1).order_by('nome')
        )
        alunos = [a for a in todos_alunos if turmas_compativeis(a.turma, avaliacao.turma)]

    quantidade = 4 if not (nominal or aluno_id) else 0

    pdf_content, _ = gerar_gabarito_pdf(avaliacao, quantidade=quantidade, alunos=alunos)

    response = HttpResponse(pdf_content, content_type='application/pdf')
    if aluno_id and alunos:
        filename = f"gabarito_{alunos[0].nome}.pdf"
    elif nominal:
        filename = f"gabaritos_turma_{avaliacao.turma}.pdf"
    else:
        filename = f"gabarito_{avaliacao.id}.pdf"

    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ---------------------------------------------------------------------------
# Correção
# ---------------------------------------------------------------------------

@login_required
def correcao(request):
    if request.method == 'POST':
        form = CorrecaoForm(request.POST, request.FILES)

        if form.is_valid():
            avaliacao = form.cleaned_data['avaliacao']
            imagem = form.cleaned_data['imagem']
            aluno_nome = form.cleaned_data['aluno_nome']
            turma = form.cleaned_data['turma']

            try:
                resultado = processar_upload(
                    imagem,
                    avaliacao.numero_questoes,
                    avaliacao.alternativas_por_questao,
                    avaliacao.gabarito
                )

                if resultado['sucesso']:
                    resultado_obj = Resultado.objects.create(
                        avaliacao=avaliacao,
                        aluno_nome=aluno_nome,
                        turma=turma,
                        respostas=resultado['respostas_detectadas'],
                        nota=resultado['nota'],
                        acertos=resultado['acertos'],
                        erros=resultado['erros'],
                        imagem_original=imagem,
                    )
                    messages.success(request, f'Correção concluída! Nota: {resultado["nota"]}')
                    return render(request, 'correcao/resultado.html', {
                        'resultado': resultado_obj,
                        'detalhes': resultado,
                    })
                else:
                    messages.error(request, f'Erro ao processar imagem: {resultado.get("erro")}')
            except Exception as e:
                logger.error(f"Erro na correção: {e}", exc_info=True)
                messages.error(request, 'Erro ao processar a imagem. Verifique se a foto está clara e tente novamente.')
    else:
        form = CorrecaoForm()

    avaliacoes = Avaliacao.objects.filter(professor=request.user).order_by('-data_criacao')
    turmas_sugeridas = AlunoITA.objects.filter(ativo=1).values_list('turma', flat=True).distinct()
    alunos_sugeridos = AlunoITA.objects.filter(ativo=1).order_by('nome')[:50]

    return render(request, 'correcao/corrigir.html', {
        'form': form,
        'avaliacoes': avaliacoes,
        'alunos_sugeridos': alunos_sugeridos,
        'turmas_sugeridas': turmas_sugeridas,
    })


@login_required
def correcao_lote(request):
    avaliacoes = Avaliacao.objects.filter(professor=request.user).order_by('-data_criacao')
    return render(request, 'correcao/lote.html', {'avaliacoes': avaliacoes})


@login_required
def api_corrigir_lote(request):
    if request.method != 'POST':
        return JsonResponse({'sucesso': False, 'erro': 'Método inválido'})

    import base64
    from PIL import Image
    import io

    try:
        data = json.loads(request.body)
        avaliacao_id = data.get('avaliacao_id')
        imagem_b64 = data.get('imagem')
        aluno_id = data.get('aluno_id')
        aluno_nome = data.get('aluno_nome', 'Aluno Desconhecido')

        if not avaliacao_id or not imagem_b64:
            return JsonResponse({'sucesso': False, 'erro': 'Dados ausentes (avaliacao_id e imagem obrigatórios)'})

        avaliacao = get_object_or_404(Avaliacao, id=avaliacao_id, professor=request.user)

        # Resolver aluno pelo ID ou por fallback nominal
        aluno_obj = None
        if aluno_id:
            try:
                aluno_obj = AlunoITA.objects.filter(id=aluno_id).first()

                if not aluno_obj:
                    numeric_id = ''.join(filter(str.isdigit, str(aluno_id)))
                    if numeric_id:
                        idx = int(numeric_id) - 1
                        alunos_turma = [
                            a for a in AlunoITA.objects.filter(ativo=1).order_by('nome')
                            if turmas_compativeis(a.turma, avaliacao.turma)
                        ]
                        if 0 <= idx < len(alunos_turma):
                            aluno_obj = alunos_turma[idx]

                if aluno_obj:
                    aluno_nome = aluno_obj.nome
            except Exception as e:
                logger.error(f"Erro ao resolver aluno (id={aluno_id}): {e}", exc_info=True)

        # Decodificar imagem Base64
        try:
            img_data = base64.b64decode(imagem_b64.split(',')[1] if ',' in imagem_b64 else imagem_b64)
            img = Image.open(io.BytesIO(img_data)).convert('RGB')
        except Exception as e:
            logger.error(f"Erro ao decodificar imagem: {e}")
            return JsonResponse({'sucesso': False, 'erro': 'Imagem inválida ou corrompida.'})

        # Gabarito
        gabarito_bruto = avaliacao.gabarito
        if isinstance(gabarito_bruto, str):
            try:
                gabarito = json.loads(gabarito_bruto.replace(",}", "}").replace(", ]", "]"))
            except json.JSONDecodeError:
                logger.warning(f"Gabarito JSON inválido na avaliação {avaliacao_id}")
                gabarito = {}
        else:
            gabarito = gabarito_bruto

        resultado = processar_upload(
            img,
            avaliacao.numero_questoes,
            avaliacao.alternativas_por_questao,
            gabarito,
        )

        if resultado['sucesso']:
            res = Resultado.objects.create(
                avaliacao=avaliacao,
                aluno_nome=aluno_nome,
                turma=aluno_obj.turma if aluno_obj else avaliacao.turma,
                respostas=resultado['respostas_detectadas'],
                nota=resultado['nota'],
                acertos=resultado['acertos'],
                erros=resultado['erros'],
            )
            return JsonResponse({
                'sucesso': True,
                'detalhes': {
                    'aluno': aluno_nome,
                    'nota': resultado['nota'],
                    'acertos': resultado['acertos'],
                    'id': str(res.id),
                },
            })
        else:
            return JsonResponse({'sucesso': False, 'erro': resultado.get('erro')})

    except Exception as e:
        logger.error(f"Erro inesperado em api_corrigir_lote: {e}", exc_info=True)
        return JsonResponse({'sucesso': False, 'erro': str(e)})


@login_required
def api_get_alunos_turma(request, avaliacao_id):
    avaliacao = get_object_or_404(Avaliacao, id=avaliacao_id, professor=request.user)

    todos_ita = list(AlunoITA.objects.filter(ativo=1).order_by('nome'))
    alunos = [a for a in todos_ita if turmas_compativeis(a.turma, avaliacao.turma)]

    resultado_alunos = set(
        Resultado.objects.filter(avaliacao=avaliacao).values_list('aluno_nome', flat=True)
    )

    lista_alunos = [
        {'nome': a.nome, 'ja_corrigido': a.nome in resultado_alunos}
        for a in alunos
    ]

    return JsonResponse({
        'sucesso': True,
        'turma': avaliacao.turma,
        'alunos': lista_alunos,
    })


# ---------------------------------------------------------------------------
# Resultados
# ---------------------------------------------------------------------------

@login_required
def lista_resultados(request):
    resultados = Resultado.objects.filter(
        avaliacao__professor=request.user
    ).select_related('avaliacao')

    filtro_avaliacao = request.GET.get('avaliacao')
    filtro_turma = request.GET.get('turma', '').strip()

    if filtro_avaliacao:
        resultados = resultados.filter(avaliacao_id=filtro_avaliacao)
    if filtro_turma:
        resultados = resultados.filter(turma__icontains=filtro_turma[:50])

    paginator = Paginator(resultados, 25)
    page = request.GET.get('page', 1)
    resultados_page = paginator.get_page(page)

    return render(request, 'resultados/lista.html', {
        'resultados': resultados_page,
        'filtro_avaliacao': filtro_avaliacao,
        'filtro_turma': filtro_turma,
        'avaliacoes': Avaliacao.objects.filter(professor=request.user),
    })


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@login_required
def dashboard(request):
    avaliacoes = Avaliacao.objects.filter(
        professor=request.user
    ).prefetch_related('resultados')

    resultados_qs = Resultado.objects.filter(avaliacao__professor=request.user)

    total_avaliacoes = avaliacoes.count()
    total_correcoes = resultados_qs.count()
    media_geral = resultados_qs.aggregate(Avg('nota'))['nota__avg'] or 0

    avaliacoes_com_resultados = []
    for av in avaliacoes:
        lista = list(av.resultados.all())
        if lista:
            media = sum(r.nota for r in lista if r.nota is not None) / len(lista)
            avaliacoes_com_resultados.append({
                'titulo': av.titulo[:20],
                'media': round(media, 2),
            })

    notas_lista = list(resultados_qs.values_list('nota', flat=True))
    if notas_lista:
        dist_notas = [
            sum(1 for n in notas_lista if n is not None and 0 <= n < 2),
            sum(1 for n in notas_lista if n is not None and 2 <= n < 4),
            sum(1 for n in notas_lista if n is not None and 4 <= n < 6),
            sum(1 for n in notas_lista if n is not None and 6 <= n < 8),
            sum(1 for n in notas_lista if n is not None and 8 <= n <= 10),
        ]
    else:
        dist_notas = [0, 0, 0, 0, 0]

    return render(request, 'dashboard/index.html', {
        'total_avaliacoes': total_avaliacoes,
        'total_correcoes': total_correcoes,
        'media_geral': round(media_geral, 2),
        'avaliacoes_grafico': avaliacoes_com_resultados,
        'dist_notas': dist_notas,
    })


# ---------------------------------------------------------------------------
# Exportar
# ---------------------------------------------------------------------------

@login_required
def exportar_view(request):
    avaliacoes = Avaliacao.objects.filter(professor=request.user)
    return render(request, 'core/exportar.html', {'avaliacoes': avaliacoes})


@login_required
def exportar_excel(request):
    resultados = Resultado.objects.filter(
        avaliacao__professor=request.user
    ).select_related('avaliacao')

    filtro_avaliacao = request.GET.get('avaliacao')
    filtro_turma = request.GET.get('turma', '').strip()

    if filtro_avaliacao:
        resultados = resultados.filter(avaliacao_id=filtro_avaliacao)
    if filtro_turma:
        resultados = resultados.filter(turma__icontains=filtro_turma[:50])

    wb = Workbook()
    ws = wb.active
    ws.title = "Resultados"
    ws.append(['Aluno', 'Turma', 'Avaliação', 'Disciplina', 'Nota', 'Acertos', 'Erros', 'Data'])

    for r in resultados:
        ws.append([
            r.aluno_nome,
            r.turma,
            r.avaliacao.titulo,
            r.avaliacao.disciplina,
            r.nota,
            r.acertos,
            r.erros,
            r.data_correcao.strftime('%d/%m/%Y %H:%M'),
        ])

    nome_arquivo = "resultados"
    if filtro_turma:
        nome_arquivo += f"_turma_{filtro_turma}"
    if filtro_avaliacao:
        nome_arquivo += f"_av_{filtro_avaliacao[:6]}"

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename={nome_arquivo}.xlsx'
    wb.save(response)
    return response


# ---------------------------------------------------------------------------
# API Correção (form upload)
# ---------------------------------------------------------------------------

@login_required
def api_corrigir(request):
    if request.method == 'POST':
        try:
            avaliacao_id = request.POST.get('avaliacao_id')
            imagem = request.FILES.get('imagem')
            aluno_nome = request.POST.get('aluno_nome', 'Anônimo')
            turma = request.POST.get('turma', '')

            avaliacao = Avaliacao.objects.get(id=avaliacao_id, professor=request.user)

            resultado = processar_upload(
                imagem,
                avaliacao.numero_questoes,
                avaliacao.alternativas_por_questao,
                avaliacao.gabarito,
            )

            if resultado['sucesso']:
                resultado_obj = Resultado.objects.create(
                    avaliacao=avaliacao,
                    aluno_nome=aluno_nome,
                    turma=turma,
                    respostas=resultado['respostas_detectadas'],
                    nota=resultado['nota'],
                    acertos=resultado['acertos'],
                    erros=resultado['erros'],
                    imagem_original=imagem,
                )
                return JsonResponse({
                    'sucesso': True,
                    'nota': resultado['nota'],
                    'acertos': resultado['acertos'],
                    'erros': resultado['erros'],
                    'respostas': resultado['respostas'],
                })
            else:
                return JsonResponse({
                    'sucesso': False,
                    'erro': resultado.get('erro', 'Erro desconhecido'),
                })
        except Exception as e:
            logger.error(f"Erro em api_corrigir: {e}", exc_info=True)
            return JsonResponse({'sucesso': False, 'erro': str(e)})

    return JsonResponse({'sucesso': False, 'erro': 'Método inválido'})


# ---------------------------------------------------------------------------
# Prova Online (pública — alunos)
# ---------------------------------------------------------------------------

@csrf_exempt
def responder_prova_online(request, pk):
    if request.method != 'POST':
        return JsonResponse({'sucesso': False, 'erro': 'Método inválido'})

    avaliacao = get_object_or_404(Avaliacao, id=pk, is_online=True)

    try:
        data = json.loads(request.body)
        aluno_nome = data.get('aluno_nome', '').strip()
        respostas_aluno = data.get('respostas', {})
        tentativa_id = data.get('tentativa_id')
        aluno_id = data.get('aluno_id')

        if not aluno_nome:
            return JsonResponse({'sucesso': False, 'erro': 'Nome do aluno é obrigatório.'})

        if Resultado.objects.filter(avaliacao=avaliacao, aluno_nome=aluno_nome).exists():
            return JsonResponse({
                'sucesso': False,
                'erro': 'Você já realizou esta prova! A nota já foi salva no sistema.',
            })

        resultado = Resultado(
            avaliacao=avaliacao,
            aluno_nome=aluno_nome,
            turma=avaliacao.turma,
            respostas=respostas_aluno,
            modo='online',
        )
        resultado.calcular_nota()
        resultado.save()

        if tentativa_id:
            from .models import Tentativa
            try:
                tentativa = Tentativa.objects.get(id=tentativa_id, avaliacao=avaliacao)
                tentativa.status = 'finalizado'
                tentativa.finalizado_em = timezone.now()
                tentativa.ultima_atividade = timezone.now()
                tentativa.save()
            except Tentativa.DoesNotExist:
                pass
        else:
            from .models import Tentativa
            aluno_obj = None
            if aluno_id:
                aluno_obj = AlunoITA.objects.filter(id=aluno_id).first()

            Tentativa.objects.create(
                avaliacao=avaliacao,
                aluno_nome=aluno_nome,
                aluno=aluno_obj,
                status='finalizado',
                iniciado_em=timezone.now(),
                finalizado_em=timezone.now(),
                ip_acesso=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            )

        return JsonResponse({
            'sucesso': True,
            'nota': resultado.nota,
            'acertos': resultado.acertos,
            'erros': resultado.erros,
        })

    except Exception as e:
        logger.error(f"Erro em responder_prova_online (pk={pk}): {e}", exc_info=True)
        return JsonResponse({'sucesso': False, 'erro': str(e)})


def prova_online(request, pk):
    avaliacao = get_object_or_404(Avaliacao, id=pk, is_online=True)
    _all_ita = list(AlunoITA.objects.filter(ativo=1).order_by('nome'))
    alunos = [a for a in _all_ita if turmas_compativeis(a.turma, avaliacao.turma)] or _all_ita

    alternativas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'][:avaliacao.alternativas_por_questao]
    range_questoes = range(1, avaliacao.numero_questoes + 1)

    return render(request, 'avaliacoes/prova_online.html', {
        'avaliacao': avaliacao,
        'alunos': alunos,
        'range_questoes': range_questoes,
        'alternativas': alternativas,
    })


# ---------------------------------------------------------------------------
# Editar / excluir resultado
# ---------------------------------------------------------------------------

@login_required
def editar_resultado(request, pk):
    resultado = get_object_or_404(Resultado, id=pk, avaliacao__professor=request.user)

    if request.method == 'POST':
        resultado.aluno_nome = request.POST.get('aluno_nome', '').strip()
        resultado.turma = request.POST.get('turma', '').strip()
        try:
            resultado.nota = float(request.POST.get('nota', 0).replace(',', '.'))
            resultado.acertos = int(request.POST.get('acertos', 0))
            resultado.erros = int(request.POST.get('erros', 0))
        except (ValueError, TypeError):
            messages.error(request, 'Valores numéricos inválidos.')
            return redirect('lista_resultados')

        resultado.save()
        messages.success(request, 'Resultado atualizado com sucesso!')
        return redirect('lista_resultados')

    return render(request, 'resultados/editar.html', {'resultado': resultado})


@login_required
def excluir_resultado(request, pk):
    resultado = get_object_or_404(Resultado, id=pk, avaliacao__professor=request.user)

    if request.method == 'POST':
        resultado.delete()
        messages.success(request, 'Resultado excluído com sucesso!')
        return redirect('lista_resultados')

    return render(request, 'resultados/excluir.html', {'resultado': resultado})


# ---------------------------------------------------------------------------
# QR Code
# ---------------------------------------------------------------------------

@login_required
def gerar_qr_prova(request, pk):
    from .models import TokenQR
    from .utils.token_utils import gerar_token_seguro
    import qrcode
    import io
    import base64
    from django.conf import settings

    avaliacao = get_object_or_404(Avaliacao, pk=pk, professor=request.user)

    if request.method == 'POST':
        tipo = request.POST.get('tipo', 'prova')
        horas_validade = int(request.POST.get('horas_validade', 24))
        max_usos = int(request.POST.get('max_usos', 0))

        if tipo == 'aluno_individual':
            aluno_id = request.POST.get('aluno_id')
            if not aluno_id:
                messages.error(request, 'Selecione um aluno para gerar token individual.')
                return redirect('gerar_qr_prova', pk=pk)
            aluno = get_object_or_404(Aluno, id=aluno_id, professor=request.user)
            token_str, expira_em = gerar_token_seguro(
                avaliacao.id, aluno.id, horas_validade, max_usos if max_usos > 0 else 1
            )
            token_obj = TokenQR.objects.create(
                avaliacao=avaliacao,
                aluno=aluno,
                token=token_str,
                tipo='aluno',
                expira_em=expira_em,
                max_usos=max_usos if max_usos > 0 else 1,
            )
        else:
            token_str, expira_em = gerar_token_seguro(
                avaliacao.id, horas_validade=horas_validade, max_usos=max_usos
            )
            token_obj = TokenQR.objects.create(
                avaliacao=avaliacao,
                token=token_str,
                tipo='prova',
                expira_em=expira_em,
                max_usos=max_usos,
            )

        site_url = getattr(settings, 'SITE_URL', request.build_absolute_uri('/').rstrip('/'))
        if token_obj.aluno:
            url_prova = f"{site_url}/publica/prova/{avaliacao.id}/qr/?token={token_str}&aluno_id={aluno.id}"
        else:
            url_prova = f"{site_url}/publica/prova/{avaliacao.id}/qr/?token={token_str}"

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(url_prova)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        qr_img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        messages.success(request, 'QR Code gerado com sucesso!')
        return render(request, 'avaliacoes/qr_code.html', {
            'avaliacao': avaliacao,
            'token': token_obj,
            'url_prova': url_prova,
            'qr_base64': qr_base64,
        })

    _alunos_ita = list(AlunoITA.objects.filter(ativo=1).order_by('nome'))
    alunos = [a for a in _alunos_ita if turmas_compativeis(a.turma, avaliacao.turma)]
    tokens_existentes = TokenQR.objects.filter(avaliacao=avaliacao).order_by('-criado_em')[:20]

    return render(request, 'avaliacoes/gerar_qr.html', {
        'avaliacao': avaliacao,
        'alunos': alunos,
        'tokens_existentes': tokens_existentes,
    })


@csrf_exempt
def prova_online_qr(request, pk):
    from .models import TokenQR, Tentativa
    from .utils.token_utils import validar_token

    avaliacao = get_object_or_404(Avaliacao, id=pk, is_online=True)

    token_str = request.GET.get('token')
    aluno_id_param = request.GET.get('aluno_id')

    token_obj = None
    aluno_pre_selecionado = None
    erro_token = None

    if token_str:
        token_obj, erro = validar_token(token_str)
        if token_obj:
            ip = request.META.get('REMOTE_ADDR')
            token_obj.registrar_uso(ip=ip)

            if token_obj.aluno:
                aluno_pre_selecionado = token_obj.aluno
            elif aluno_id_param:
                aluno_pre_selecionado = AlunoITA.objects.filter(
                    id=aluno_id_param, professor=avaliacao.professor
                ).first()
        else:
            erro_token = erro

    _all_ita2 = list(AlunoITA.objects.filter(ativo=1).order_by('nome'))
    alunos = [a for a in _all_ita2 if turmas_compativeis(a.turma, avaliacao.turma)] or _all_ita2

    alternativas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'][:avaliacao.alternativas_por_questao]
    range_questoes = range(1, avaliacao.numero_questoes + 1)

    return render(request, 'avaliacoes/prova_online.html', {
        'avaliacao': avaliacao,
        'alunos': alunos,
        'range_questoes': range_questoes,
        'alternativas': alternativas,
        'token_valido': token_obj is not None,
        'token_obj': token_obj,
        'aluno_pre_selecionado': aluno_pre_selecionado,
        'erro_token': erro_token,
    })


# ---------------------------------------------------------------------------
# Modo Sala
# ---------------------------------------------------------------------------

@login_required
def modo_sala(request, pk):
    from .models import Tentativa
    from datetime import timedelta

    avaliacao = get_object_or_404(Avaliacao, pk=pk, professor=request.user)

    cutoff = timezone.now() - timedelta(minutes=30)
    tentativas_ativas = Tentativa.objects.filter(
        avaliacao=avaliacao,
        ultima_atividade__gte=cutoff,
    ).exclude(status='finalizado').order_by('-iniciado_em')

    tentativas_finalizadas = Tentativa.objects.filter(
        avaliacao=avaliacao,
        status='finalizado',
    ).order_by('-finalizado_em')[:50]

    resultados = Resultado.objects.filter(avaliacao=avaliacao).order_by('-data_correcao')[:50]

    conectados = tentativas_ativas.filter(status__in=['conectado', 'iniciado', 'em_andamento']).count()
    finalizados_count = tentativas_ativas.filter(status='finalizado').count()

    return render(request, 'avaliacoes/modo_sala.html', {
        'avaliacao': avaliacao,
        'tentativas_ativas': tentativas_ativas,
        'tentativas_finalizadas': tentativas_finalizadas,
        'resultados': resultados,
        'conectados': conectados,
        'finalizados': finalizados_count,
        'total_resultados': resultados.count(),
    })


@csrf_exempt
def api_aluno_tentativa(request, pk):
    if request.method != 'POST':
        return JsonResponse({'sucesso': False, 'erro': 'Método inválido'})

    from .models import Tentativa

    avaliacao = get_object_or_404(Avaliacao, id=pk, is_online=True)

    try:
        data = json.loads(request.body)
        acao = data.get('acao', 'registrar')

        if acao == 'registrar':
            aluno_nome = data.get('aluno_nome', 'Desconhecido')
            status = data.get('status', 'iniciado')
            aluno_id = data.get('aluno_id')
            token_id = data.get('token_id')

            aluno_obj = None
            if aluno_id:
                aluno_obj = AlunoITA.objects.filter(id=aluno_id).first()

            token_obj = None
            if token_id:
                from .models import TokenQR
                token_obj = TokenQR.objects.filter(id=token_id).first()

            tentativa = Tentativa.objects.create(
                avaliacao=avaliacao,
                aluno_nome=aluno_nome,
                aluno=aluno_obj,
                token_qr=token_obj,
                status=status,
                iniciado_em=timezone.now() if status in ['iniciado', 'em_andamento'] else None,
                ip_acesso=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            )
            return JsonResponse({'sucesso': True, 'tentativa_id': str(tentativa.id)})

        elif acao == 'atualizar':
            tentativa_id = data.get('tentativa_id')
            status = data.get('status')

            try:
                tentativa = Tentativa.objects.get(id=tentativa_id, avaliacao=avaliacao)
                tentativa.status = status
                tentativa.ultima_atividade = timezone.now()
                if status == 'iniciado' and not tentativa.iniciado_em:
                    tentativa.iniciado_em = timezone.now()
                elif status == 'finalizado':
                    tentativa.finalizado_em = timezone.now()
                tentativa.save()
                return JsonResponse({'sucesso': True})
            except Tentativa.DoesNotExist:
                return JsonResponse({'sucesso': False, 'erro': 'Tentativa não encontrada'})

        return JsonResponse({'sucesso': False, 'erro': 'Ação inválida'})

    except Exception as e:
        logger.error(f"Erro em api_aluno_tentativa (pk={pk}): {e}", exc_info=True)
        return JsonResponse({'sucesso': False, 'erro': str(e)})


@login_required
def api_modo_sala(request, pk):
    from .models import Tentativa, TokenQR
    from datetime import timedelta

    avaliacao = get_object_or_404(Avaliacao, pk=pk, professor=request.user)
    acao = request.GET.get('acao', 'listar')

    if acao == 'listar':
        cutoff = timezone.now() - timedelta(minutes=30)
        tentativas_ativas = Tentativa.objects.filter(
            avaliacao=avaliacao,
            ultima_atividade__gte=cutoff,
        ).exclude(status='finalizado').order_by('-iniciado_em')

        dados = [
            {
                'id': str(t.id),
                'aluno_nome': t.aluno_nome,
                'status': t.status,
                'status_display': t.get_status_display(),
                'iniciado_em': t.iniciado_em.strftime('%H:%M:%S') if t.iniciado_em else '-',
                'ultima_atividade': t.ultima_atividade.strftime('%H:%M:%S'),
                'duracao': int(t.duracao_segundos()),
            }
            for t in tentativas_ativas
        ]
        return JsonResponse({'sucesso': True, 'tentativas': dados, 'total_ativos': len(dados)})

    elif acao in ('registrar', 'atualizar'):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'sucesso': False, 'erro': 'JSON inválido'})

        if acao == 'registrar':
            aluno_nome = data.get('aluno_nome', 'Desconhecido')
            status = data.get('status', 'conectado')
            aluno_id = data.get('aluno_id')
            token_id = data.get('token_id')

            aluno_obj = AlunoITA.objects.filter(id=aluno_id).first() if aluno_id else None
            token_obj = TokenQR.objects.filter(id=token_id).first() if token_id else None

            tentativa = Tentativa.objects.create(
                avaliacao=avaliacao,
                aluno_nome=aluno_nome,
                aluno=aluno_obj,
                token_qr=token_obj,
                status=status,
                iniciado_em=timezone.now() if status in ['iniciado', 'em_andamento'] else None,
                ip_acesso=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            )
            return JsonResponse({'sucesso': True, 'tentativa_id': str(tentativa.id)})

        else:  # atualizar
            tentativa_id = data.get('tentativa_id')
            status = data.get('status')
            try:
                tentativa = Tentativa.objects.get(id=tentativa_id, avaliacao=avaliacao)
                tentativa.status = status
                tentativa.ultima_atividade = timezone.now()
                if status == 'iniciado' and not tentativa.iniciado_em:
                    tentativa.iniciado_em = timezone.now()
                elif status == 'finalizado':
                    tentativa.finalizado_em = timezone.now()
                tentativa.save()
                return JsonResponse({'sucesso': True})
            except Tentativa.DoesNotExist:
                return JsonResponse({'sucesso': False, 'erro': 'Tentativa não encontrada'})

    return JsonResponse({'sucesso': False, 'erro': 'Ação inválida'})


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------

@login_required
def api_revogar_token(request, pk):
    from .models import TokenQR
    token_obj = get_object_or_404(TokenQR, pk=pk, avaliacao__professor=request.user)
    token_obj.status = 'revogado'
    token_obj.save()
    return JsonResponse({'sucesso': True, 'mensagem': 'Token revogado com sucesso'})


@login_required
def api_limpar_tokens_expirados(request, avaliacao_id):
    from .models import TokenQR
    avaliacao = get_object_or_404(Avaliacao, pk=avaliacao_id, professor=request.user)
    expirados = TokenQR.objects.filter(avaliacao=avaliacao, expira_em__lt=timezone.now())
    count = expirados.count()
    expirados.delete()
    return JsonResponse({'sucesso': True, 'limpos': count})


# ---------------------------------------------------------------------------
# Erros
# ---------------------------------------------------------------------------

def erro_404(request, exception):
    return render(request, 'erros/404.html', status=404)


def erro_500(request):
    return render(request, 'erros/500.html', status=500)


# ---------------------------------------------------------------------------
# API JSON para o Dashboard CEITEC — sem proxy VPS
# ---------------------------------------------------------------------------

CHAVE_MAGICA = 'gamificaedu_secreto_2026'

@csrf_exempt
def api_resultados_json(request):
    """Retorna resultados do professor como JSON para o Dashboard CEITEC.
    Chamado direto do browser (CORS). Auth via chave mágica + email."""

    def cors(response):
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response

    if request.method == 'OPTIONS':
        return cors(HttpResponse())

    chave = request.GET.get('chave', '')
    email = request.GET.get('email', '').strip()

    if chave != CHAVE_MAGICA:
        return cors(JsonResponse({'erro': 'Chave inválida'}, status=403))

    try:
        professor = Usuario.objects.get(email=email)
    except Usuario.DoesNotExist:
        return cors(JsonResponse({'erro': 'Professor não encontrado'}, status=404))

    resultados_qs = (
        Resultado.objects
        .filter(avaliacao__professor=professor)
        .select_related('avaliacao')
        .order_by('avaliacao__data_criacao', 'aluno_nome')
    )

    avaliacoes_map = {}
    for r in resultados_qs:
        av_id = str(r.avaliacao.id)
        if av_id not in avaliacoes_map:
            avaliacoes_map[av_id] = {
                'titulo': r.avaliacao.titulo,
                'disciplina': r.avaliacao.disciplina,
                'turma': r.avaliacao.turma,
                'numero_questoes': r.avaliacao.numero_questoes,
                'gabarito': r.avaliacao.gabarito,
                'resultados': [],
            }
        gabarito = r.avaliacao.gabarito or {}
        questoes_detalhe = []
        for q in sorted(gabarito.keys(), key=lambda x: int(x)):
            gabarito_resp = gabarito[q]
            aluno_resp = (r.respostas or {}).get(str(q), '')
            questoes_detalhe.append({
                'numero': int(q),
                'gabarito': gabarito_resp,
                'resposta_aluno': aluno_resp,
                'acertou': aluno_resp.upper() == gabarito_resp.upper() if aluno_resp else False,
            })

        avaliacoes_map[av_id]['resultados'].append({
            'aluno': r.aluno_nome,
            'turma': r.turma,
            'nota': round(r.nota, 1) if r.nota is not None else 0,
            'acertos': r.acertos,
            'erros': r.erros,
            'data': r.data_correcao.strftime('%d/%m/%Y'),
            'questoes_detalhe': questoes_detalhe,
        })

    data = []
    for av in avaliacoes_map.values():
        ress = av['resultados']
        media = round(sum(r['nota'] for r in ress) / len(ress), 1) if ress else 0
        turmas = ', '.join(sorted({r['turma'] for r in ress if r['turma']}))
        data.append({
            'titulo': av['titulo'],
            'disciplina': av['disciplina'],
            'turmas': turmas or av['turma'],
            'numero_questoes': av['numero_questoes'],
            'total_alunos': len(ress),
            'media': str(media),
            'resultados': ress,
        })

    return cors(JsonResponse(data, safe=False))


@csrf_exempt
def api_sync_alunos(request):
    """Recebe alunos do sistema ITA e salva localmente para uso no corretor."""
    if request.method != 'POST':
        return JsonResponse({'erro': 'Metodo nao permitido'}, status=405)
    try:
        data = json.loads(request.body)
        if data.get('chave') != 'gamificaedu_secreto_2026':
            return JsonResponse({'erro': 'Chave invalida'}, status=403)
        criados = 0
        for a in data.get('alunos', []):
            nome = a.get('nome', '').strip()
            turma = a.get('turma', '').strip()
            if nome and turma:
                AlunoITA.objects.get_or_create(
                    nome=nome, turma=turma,
                    defaults={'codigo': a.get('codigo', ''), 'ativo': 1}
                )
                criados += 1
        return JsonResponse({'ok': True, 'sincronizados': criados})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)

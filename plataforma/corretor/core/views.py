import json
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import models as db_models
from django.db.models import Avg, Count, Max, Min
from django.db.models import Prefetch
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import datetime
from openpyxl import Workbook
import csv
from .models import Usuario, Avaliacao, Resultado, Estatisticas, Aluno, Escola, LogAcessoNegado
from .mixins import require_perfil
from .forms import AvaliacaoForm, CorrecaoForm, UsuarioCreationForm
from .utils.leitor_gabarito import processar_upload
from .utils.gerador_pdf import gerar_gabarito_pdf
from .utils.helpers import normalizar_turma, turmas_compativeis

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Importação de Alunos
# ---------------------------------------------------------------------------

@login_required
def importar_alunos_view(request):
    if request.method == 'POST':
        arquivo = request.FILES.get('arquivo')
        if not arquivo:
            messages.error(request, 'Selecione um arquivo .csv')
            return redirect('importar_alunos')

        # Validação básica de tamanho e tipo
        if arquivo.size > 5 * 1024 * 1024:
            messages.error(request, 'Arquivo muito grande. Máximo 5MB.')
            return redirect('importar_alunos')

        nome_lower = arquivo.name.lower()
        if not (nome_lower.endswith('.csv') or nome_lower.endswith('.txt')):
            messages.error(request, 'Apenas arquivos .csv são permitidos.')
            return redirect('importar_alunos')

        try:
            conteudo = arquivo.read()
            decoded_file = None

            for encoding in ['utf-8-sig', 'iso-8859-1', 'cp1252', 'latin-1']:
                try:
                    decoded_file = conteudo.decode(encoding).splitlines()
                    break
                except UnicodeDecodeError:
                    continue

            if not decoded_file:
                messages.error(request, 'Não foi possível ler o arquivo. Tente salvar como CSV UTF-8.')
                return redirect('importar_alunos')

            primeira_linha = decoded_file[0]
            delimitador = ';' if ';' in primeira_linha else (',' if ',' in primeira_linha else '\t')

            reader = csv.DictReader(decoded_file, delimiter=delimitador)
            contador = 0

            for row in reader:
                dados = {
                    str(k).strip().lower().replace('\ufeff', ''): str(v).strip()
                    for k, v in row.items() if k
                }
                nome = dados.get('nome') or dados.get('aluno') or dados.get('student')
                turma = dados.get('turma') or dados.get('classe') or dados.get('class')

                if nome and turma:
                    Aluno.objects.get_or_create(
                        nome=nome,
                        turma=turma,
                        professor=request.user
                    )
                    contador += 1

            if contador > 0:
                messages.success(request, f'{contador} alunos importados com sucesso!')
            else:
                messages.warning(request, 'Nenhum aluno encontrado. Verifique se as colunas são "Nome" e "Turma".')

        except Exception as e:
            logger.error(f"Erro ao importar alunos: {e}", exc_info=True)
            messages.error(request, f'Erro ao processar arquivo.')

        return redirect('importar_alunos')

    alunos = Aluno.objects.filter(professor=request.user)

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
    })


# ---------------------------------------------------------------------------
# Autenticação
# ---------------------------------------------------------------------------

def _redirecionar_por_perfil(usuario):
    """Retorna o redirect correto baseado no perfil do usuário."""
    perfil = getattr(usuario, 'perfil', 'sem_grupo')
    if perfil == 'ita_admin':
        return redirect('dashboard_ita_admin')
    if perfil == 'coordenador':
        return redirect('dashboard_coordenador')
    if perfil == 'professor':
        return redirect('home')
    return redirect('sem_acesso')


def login_view(request):
    if request.user.is_authenticated:
        return _redirecionar_por_perfil(request.user)

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return _redirecionar_por_perfil(user)
        else:
            messages.error(request, 'Usuário ou senha inválidos.')

    return render(request, 'registration/login.html')


def logout_view(request):
    logout(request)
    return redirect('login')


EMAILS_ADMIN_ITA = {'itagamificaedu@gmail.com', 'itaceitec@gmail.com'}

def login_magico(request):
    """SSO automático via chave compartilhada — integração com plataforma ITA."""
    chave    = request.GET.get('chave', '')
    email    = request.GET.get('email', '')
    nome     = request.GET.get('nome', email.split('@')[0] if email else '')
    next_url = request.GET.get('next', '')

    if chave != 'gamificaedu_secreto_2026' or not email:
        return redirect('login')

    eh_admin = email.strip().lower() in EMAILS_ADMIN_ITA

    try:
        usuario = Usuario.objects.get(email=email)
    except Usuario.DoesNotExist:
        partes = nome.strip().split(' ', 1)
        username_base = email.split('@')[0]
        username = username_base
        contador = 1
        while Usuario.objects.filter(username=username).exists():
            username = f"{username_base}{contador}"
            contador += 1
        perfil_inicial = 'ita_admin' if eh_admin else 'professor'
        usuario = Usuario(
            username=username,
            email=email,
            first_name=partes[0],
            last_name=partes[1] if len(partes) > 1 else '',
            tipo_usuario=perfil_inicial,
            perfil=perfil_inicial,
        )
        usuario.set_unusable_password()
        if eh_admin:
            usuario.is_superuser = True
            usuario.is_staff = True
        usuario.save()

    # Garantir que admin sempre tenha superuser (mesmo se já existia como professor)
    if eh_admin and (not usuario.is_superuser or usuario.perfil != 'ita_admin'):
        usuario.is_superuser = True
        usuario.is_staff = True
        usuario.perfil = 'ita_admin'
        usuario.tipo_usuario = 'ita_admin'
        usuario.save(update_fields=['is_superuser', 'is_staff', 'perfil', 'tipo_usuario'])

    if not usuario.is_active:
        usuario.is_active = True
        usuario.save(update_fields=['is_active'])

    login(request, usuario, backend='django.contrib.auth.backends.ModelBackend')
    # next_url tem prioridade (ex: link direto para prova); senão vai ao dashboard
    if next_url:
        return redirect(next_url)
    return _redirecionar_por_perfil(usuario)


@csrf_exempt
def api_sync_alunos(request):
    """Recebe lista de alunos do sistema CEITEC e cadastra no corretor vinculados ao professor."""
    if request.method == 'OPTIONS':
        resp = HttpResponse()
        resp['Access-Control-Allow-Origin'] = '*'
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return resp

    if request.method != 'POST':
        return JsonResponse({'erro': 'Método não permitido'}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'erro': 'JSON inválido'}, status=400)

    chave  = data.get('chave', '')
    email  = data.get('email', '')
    alunos = data.get('alunos', [])

    if chave != 'gamificaedu_secreto_2026' or not email:
        resp = JsonResponse({'erro': 'Não autorizado'}, status=403)
        resp['Access-Control-Allow-Origin'] = '*'
        return resp

    try:
        professor = Usuario.objects.get(email=email)
    except Usuario.DoesNotExist:
        resp = JsonResponse({'erro': 'Professor não encontrado'}, status=404)
        resp['Access-Control-Allow-Origin'] = '*'
        return resp

    criados = 0
    for a in alunos:
        nome   = str(a.get('nome', '')).strip()
        turma  = str(a.get('turma', '')).strip()
        codigo = str(a.get('codigo', '')).strip()
        if nome and turma:
            obj, created = Aluno.objects.get_or_create(
                nome=nome, turma=turma, professor=professor
            )
            # Atualiza o código sempre que mudar
            if codigo and obj.codigo != codigo:
                obj.codigo = codigo
                obj.save(update_fields=['codigo'])
            if created:
                criados += 1

    resp = JsonResponse({'ok': True, 'criados': criados, 'total': len(alunos)})
    resp['Access-Control-Allow-Origin'] = '*'
    return resp



@csrf_exempt
def api_verificar_codigo_aluno(request, pk):
    """Verifica código do aluno no token geral e retorna o nome se válido."""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'erro': 'Método inválido'})

    avaliacao = get_object_or_404(Avaliacao, id=pk, is_online=True)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'ok': False, 'erro': 'JSON inválido'})

    codigo = str(data.get('codigo', '')).strip()
    if not codigo:
        return JsonResponse({'ok': False, 'erro': 'Informe seu código de matrícula.'})

    # Busca apenas na turma desta avaliação — sem fallback para outras turmas
    aluno = Aluno.objects.filter(
        codigo__iexact=codigo,
        turma=avaliacao.turma,
    ).first()

    if not aluno:
        return JsonResponse({'ok': False, 'erro': 'Código não encontrado nesta turma. Verifique com seu professor.'})

    resp = JsonResponse({'ok': True, 'nome': aluno.nome, 'aluno_id': str(aluno.id), 'turma': aluno.turma or ''})
    resp['Access-Control-Allow-Origin'] = '*'
    return resp


def registro_view(request):
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        form = UsuarioCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Conta criada com sucesso!')
            return redirect('home')
    else:
        form = UsuarioCreationForm()

    return render(request, 'registration/registro.html', {'form': form})


# ---------------------------------------------------------------------------
# Home
# ---------------------------------------------------------------------------

@login_required
def home(request):
    # Redireciona perfis especiais para seus dashboards
    perfil = getattr(request.user, 'perfil', 'professor')
    if perfil == 'ita_admin':
        return redirect('dashboard_ita_admin')
    if perfil == 'coordenador':
        return redirect('dashboard_coordenador')
    if perfil == 'sem_grupo':
        return redirect('sem_acesso')

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
    # ita_admin ve todas as avaliacoes; professor ve so as suas
    if getattr(request.user, 'perfil', '') == 'ita_admin':
        avaliacoes = Avaliacao.objects.all()
    else:
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

        if is_online and status == 'publicada' and not gabarito:
            messages.error(request, 'Não é possível publicar uma prova online sem gabarito. Preencha o gabarito antes de publicar.')
            return redirect('criar_avaliacao')

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
        Aluno.objects.filter(professor=request.user)
        .values_list('turma', flat=True)
        .distinct()
        .order_by('turma')
    )
    return render(request, 'avaliacoes/criar.html', {'turmas_existentes': turmas_existentes})


@login_required
def editar_avaliacao(request, pk):
    is_admin = (
        request.user.is_superuser
        or getattr(request.user, 'perfil', '') == 'ita_admin'
        or request.user.email in EMAILS_ADMIN_ITA
    )
    if is_admin:
        avaliacao = get_object_or_404(Avaliacao, pk=pk)
    else:
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

        if avaliacao.is_online and avaliacao.status == 'publicada' and not avaliacao.gabarito:
            messages.error(request, 'Não é possível salvar uma prova online publicada sem gabarito. Preencha o gabarito antes de publicar.')
            return redirect('editar_avaliacao', pk=pk)

        avaliacao.save()
        messages.success(request, 'Avaliação atualizada com sucesso!')
        return redirect('lista_avaliacoes')

    # ita_admin usa as turmas do professor da prova; professor usa as suas
    prof_turmas = avaliacao.professor if getattr(request.user, 'perfil', '') == 'ita_admin' else request.user
    turmas_existentes = (
        Aluno.objects.filter(professor=prof_turmas)
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
    # ita_admin ve qualquer avaliacao; professor ve apenas as suas
    if getattr(request.user, 'perfil', '') == 'ita_admin' or request.user.is_superuser:
        avaliacao = get_object_or_404(Avaliacao, pk=pk)
    else:
        avaliacao = get_object_or_404(Avaliacao, pk=pk, professor=request.user)
    # alunos: usa o professor da avaliacao para ita_admin
    prof_ref = avaliacao.professor if (getattr(request.user, 'perfil', '') == 'ita_admin' or request.user.is_superuser) else request.user
    alunos = Aluno.objects.filter(professor=prof_ref, turma=avaliacao.turma).order_by('nome')
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
@login_required
def excluir_avaliacao(request, pk):
    # admin pode excluir qualquer avaliacao; professor apenas as suas
    is_admin = (
        request.user.is_superuser
        or getattr(request.user, 'perfil', '') == 'ita_admin'
        or request.user.email in EMAILS_ADMIN_ITA
    )
    if is_admin:
        avaliacao = get_object_or_404(Avaliacao, pk=pk)
    else:
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
        alunos = Aluno.objects.filter(id=aluno_id, professor=request.user)
    elif nominal:
        todos_alunos = list(
            Aluno.objects.filter(professor=request.user).order_by('nome')
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

    if getattr(request.user, 'perfil', '') == 'ita_admin':
        avaliacoes = Avaliacao.objects.all().order_by('-data_criacao')
    else:
        avaliacoes = Avaliacao.objects.filter(professor=request.user).order_by('-data_criacao')
    turmas_sugeridas = Aluno.objects.filter(professor=request.user).values_list('turma', flat=True).distinct()
    alunos_sugeridos = Aluno.objects.filter(professor=request.user).order_by('nome')[:50]

    return render(request, 'correcao/corrigir.html', {
        'form': form,
        'avaliacoes': avaliacoes,
        'alunos_sugeridos': alunos_sugeridos,
        'turmas_sugeridas': turmas_sugeridas,
    })


@login_required
def correcao_lote(request):
    if getattr(request.user, 'perfil', '') == 'ita_admin':
        avaliacoes = Avaliacao.objects.all().order_by('-data_criacao')
    else:
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

        # ita_admin pode ver qualquer avaliacao
        if getattr(request.user, 'perfil', '') == 'ita_admin':
            avaliacao = get_object_or_404(Avaliacao, id=avaliacao_id)
        else:
            avaliacao = get_object_or_404(Avaliacao, id=avaliacao_id, professor=request.user)

        # Resolver aluno pelo ID ou por fallback nominal
        aluno_obj = None
        if aluno_id:
            try:
                aluno_obj = Aluno.objects.filter(id=aluno_id).first()

                if not aluno_obj:
                    numeric_id = ''.join(filter(str.isdigit, str(aluno_id)))
                    if numeric_id:
                        idx = int(numeric_id) - 1
                        alunos_turma = [
                            a for a in Aluno.objects.filter(professor=request.user).order_by('nome')
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
    # ita_admin pode editar qualquer avaliacao
    if getattr(request.user, 'perfil', '') == 'ita_admin':
        avaliacao = get_object_or_404(Avaliacao, id=avaliacao_id)
    else:
        avaliacao = get_object_or_404(Avaliacao, id=avaliacao_id, professor=request.user)

    alunos = Aluno.objects.filter(
        professor=request.user,
        turma=avaliacao.turma
    ).order_by('nome')

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
    is_admin = (getattr(request.user, 'perfil', '') in ('ita_admin', 'admin')
                or request.user.is_superuser
                or request.user.email in EMAILS_ADMIN_ITA)
    if is_admin:
        resultados = Resultado.objects.all().select_related('avaliacao', 'avaliacao__professor')
    else:
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

    if is_admin:
        avaliacoes = Avaliacao.objects.all()
        turmas_disponiveis = (
            Resultado.objects.exclude(turma='').exclude(turma__isnull=True)
            .values_list('turma', flat=True).distinct().order_by('turma')
        )
    else:
        avaliacoes = Avaliacao.objects.filter(professor=request.user)
        turmas_disponiveis = (
            Resultado.objects.filter(avaliacao__professor=request.user)
            .exclude(turma='').exclude(turma__isnull=True)
            .values_list('turma', flat=True).distinct().order_by('turma')
        )

    return render(request, 'resultados/lista.html', {
        'resultados': resultados_page,
        'filtro_avaliacao': filtro_avaliacao,
        'filtro_turma': filtro_turma,
        'avaliacoes': avaliacoes,
        'turmas_disponiveis': turmas_disponiveis,
        'is_admin': is_admin,
    })


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@login_required
def dashboard(request):
    # admin ve todos os dados; professor ve apenas os seus
    is_admin = (
        request.user.is_superuser
        or getattr(request.user, 'perfil', '') == 'ita_admin'
        or request.user.email in EMAILS_ADMIN_ITA
    )

    if is_admin:
        avaliacoes = Avaliacao.objects.all().prefetch_related('resultados')
        resultados_qs = Resultado.objects.all()
    else:
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
    is_admin = (getattr(request.user, 'perfil', '') in ('ita_admin', 'admin')
                or request.user.is_superuser
                or request.user.email in EMAILS_ADMIN_ITA)
    if is_admin:
        avaliacoes = Avaliacao.objects.all()
    else:
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

    if not avaliacao.liberada:
        return JsonResponse({'sucesso': False, 'erro': 'Esta prova não está liberada pelo professor.'})

    if not avaliacao.gabarito:
        return JsonResponse({'sucesso': False, 'erro': 'Esta prova ainda não tem gabarito configurado. Avise o professor ou coordenador.'})

    try:
        data = json.loads(request.body)
        aluno_nome = data.get('aluno_nome', '').strip()
        respostas_aluno = data.get('respostas', {})
        tentativa_id = data.get('tentativa_id')
        aluno_id = data.get('aluno_id')

        if not aluno_nome:
            return JsonResponse({'sucesso': False, 'erro': 'Nome do aluno é obrigatório.'})

        # Valida se o nome pertence à turma desta avaliação
        # (só quando não há aluno_id — token individual já é seguro)
        if not aluno_id:
            alunos_turma = Aluno.objects.filter(
                turma=avaliacao.turma,
                professor=avaliacao.professor
            )
            if alunos_turma.exists():
                nomes_turma = [a.nome.strip().lower() for a in alunos_turma]
                if aluno_nome.strip().lower() not in nomes_turma:
                    return JsonResponse({
                        'sucesso': False,
                        'erro': 'Seu nome não foi encontrado na lista da turma. Selecione seu nome corretamente.',
                    })

        resultado_existente = Resultado.objects.filter(avaliacao=avaliacao, aluno_nome=aluno_nome).first()
        if resultado_existente:
            if resultado_existente.nota is not None:
                return JsonResponse({
                    'sucesso': False,
                    'erro': 'Você já realizou esta prova! A nota já foi salva no sistema.',
                })
            else:
                # Resultado fantasma (nota None = submissão vazia) — apaga e permite nova tentativa
                resultado_existente.delete()

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
                aluno_obj = Aluno.objects.filter(id=aluno_id, professor=avaliacao.professor).first()

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
    """Acesso direto: aluno digita o código de matrícula para se identificar."""
    avaliacao = get_object_or_404(Avaliacao, id=pk, is_online=True)

    # Bloqueia acesso se prova não estiver liberada pelo professor
    if not avaliacao.liberada:
        return render(request, 'avaliacoes/prova_bloqueada.html', {'avaliacao': avaliacao})

    # Se vier com token na URL, redireciona para a view de token
    token = request.GET.get('token')
    if token:
        from django.shortcuts import redirect as _redirect
        return _redirect(f'/publica/prova/{pk}/qr/?token={token}')

    # Sem token: mostra campo de código — alunos da turma podem entrar
    alternativas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'][:avaliacao.alternativas_por_questao]
    range_questoes = range(1, avaliacao.numero_questoes + 1)

    return render(request, 'avaliacoes/prova_online.html', {
        'avaliacao': avaliacao,
        'alunos': [],
        'range_questoes': range_questoes,
        'alternativas': alternativas,
        'token_valido': True,        # trata como acesso geral — código valida a identidade
        'token_obj': None,
        'aluno_pre_selecionado': None,
        'erro_token': None,
        'acesso_direto': True,       # flag para distinguir do token QR se necessário
    })


# ---------------------------------------------------------------------------
# Editar / excluir resultado
# ---------------------------------------------------------------------------

@login_required
def editar_resultado(request, pk):
    is_admin = request.user.email in EMAILS_ADMIN_ITA or getattr(getattr(request.user, 'perfil', None), 'perfil', None) == 'ita_admin'
    if is_admin:
        resultado = get_object_or_404(Resultado, id=pk)
    else:
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
    is_admin = request.user.email in EMAILS_ADMIN_ITA or getattr(getattr(request.user, 'perfil', None), 'perfil', None) == 'ita_admin'
    if is_admin:
        resultado = get_object_or_404(Resultado, id=pk)
    else:
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

    eh_admin = getattr(request.user, 'is_superuser', False) or getattr(request.user, 'perfil', '') == 'ita_admin'
    if eh_admin:
        avaliacao = get_object_or_404(Avaliacao, pk=pk)
    else:
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

    alunos = Aluno.objects.filter(professor=request.user, turma=avaliacao.turma).order_by('nome')
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

    # Bloqueia acesso se prova não estiver liberada pelo professor
    if not avaliacao.liberada:
        return render(request, 'avaliacoes/prova_bloqueada.html', {'avaliacao': avaliacao})

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
                aluno_pre_selecionado = Aluno.objects.filter(
                    id=aluno_id_param, professor=avaliacao.professor
                ).first()
        else:
            erro_token = erro

    alternativas = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'][:avaliacao.alternativas_por_questao]
    range_questoes = range(1, avaliacao.numero_questoes + 1)

    # Se o token identifica o aluno individualmente, NÃO passa lista de nomes
    if aluno_pre_selecionado:
        alunos_ctx = []
    else:
        # Token geral: mostra APENAS os alunos da turma desta avaliação
        alunos_ctx = list(
            Aluno.objects.filter(
                turma=avaliacao.turma,
                professor=avaliacao.professor
            ).order_by('nome').values('id', 'nome')
        )

    return render(request, 'avaliacoes/prova_online.html', {
        'avaliacao': avaliacao,
        'alunos': alunos_ctx,
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
                aluno_obj = Aluno.objects.filter(id=aluno_id, professor=avaliacao.professor).first()

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

            aluno_obj = Aluno.objects.filter(id=aluno_id, professor=avaliacao.professor).first() if aluno_id else None
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



# ===========================================================================
# LIBERAR / BLOQUEAR PROVA ONLINE
# ===========================================================================

@csrf_exempt
@login_required
def api_liberar_prova(request, pk):
    """Professor ou admin libera/bloqueia o acesso dos alunos à prova online."""
    if request.method != 'POST':
        return JsonResponse({'sucesso': False, 'erro': 'Método não permitido'}, status=405)

    is_admin = request.user.email in EMAILS_ADMIN_ITA or getattr(
        getattr(request.user, 'perfil', None), 'perfil', None
    ) == 'ita_admin'

    if is_admin:
        avaliacao = get_object_or_404(Avaliacao, id=pk)
    else:
        avaliacao = get_object_or_404(Avaliacao, id=pk, professor=request.user)

    try:
        data = json.loads(request.body)
        acao = data.get('acao')  # 'liberar' ou 'bloquear'
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({'sucesso': False, 'erro': 'JSON inválido'}, status=400)

    if acao == 'liberar':
        if avaliacao.is_online and not avaliacao.gabarito:
            return JsonResponse({'sucesso': False, 'erro': 'Impossível liberar: esta prova online não tem gabarito configurado. Adicione o gabarito antes de liberar.'}, status=400)
        avaliacao.liberada = True
        avaliacao.save(update_fields=['liberada'])
        return JsonResponse({'sucesso': True, 'liberada': True, 'mensagem': 'Prova liberada para os alunos!'})
    elif acao == 'bloquear':
        avaliacao.liberada = False
        avaliacao.save(update_fields=['liberada'])
        return JsonResponse({'sucesso': True, 'liberada': False, 'mensagem': 'Prova bloqueada. Alunos não podem mais acessar.'})
    else:
        return JsonResponse({'sucesso': False, 'erro': 'Ação inválida. Use "liberar" ou "bloquear".'}, status=400)


# ===========================================================================
# PERFIS DE ACESSO — ITA Admin / Coordenador / Sem Acesso / Impersonação
# ===========================================================================

# ---------------------------------------------------------------------------
# Sem Acesso
# ---------------------------------------------------------------------------

@login_required
def sem_acesso(request):
    return render(request, 'acesso/sem_acesso.html', {
        'perfil': getattr(request.user, 'perfil', 'sem_grupo'),
    })


# ---------------------------------------------------------------------------
# Dashboard ITA Admin
# ---------------------------------------------------------------------------

@require_perfil('ita_admin')
def dashboard_ita_admin(request):
    total_escolas = Escola.objects.filter(ativa=True).count()
    total_usuarios = Usuario.objects.filter(is_active=True).count()
    total_avaliacoes = Avaliacao.objects.count()
    total_correcoes = Resultado.objects.count()

    professores = Usuario.objects.filter(perfil='professor').select_related('escola').order_by('escola__nome', 'first_name')[:50]
    escolas = Escola.objects.filter(ativa=True).annotate(
        qtd_usuarios=Count('usuarios'),
    ).order_by('nome')[:20]

    logs_recentes = LogAcessoNegado.objects.select_related('usuario').order_by('-data')[:10]

    context = {
        'total_escolas': total_escolas,
        'total_usuarios': total_usuarios,
        'total_avaliacoes': total_avaliacoes,
        'total_correcoes': total_correcoes,
        'professores': professores,
        'escolas': escolas,
        'logs_recentes': logs_recentes,
        'impersonando': request.session.get('impersonar_nome', ''),
    }
    return render(request, 'acesso/dashboard_ita_admin.html', context)


# ---------------------------------------------------------------------------
# Dashboard Coordenador
# ---------------------------------------------------------------------------

@require_perfil('coordenador')
def dashboard_coordenador(request):
    escola = request.user.escola
    if not escola:
        messages.warning(request, 'Sua conta não está vinculada a nenhuma escola. Contate o ITA Admin.')
        return redirect('sem_acesso')

    professores = Usuario.objects.filter(escola=escola, perfil='professor')
    total_avaliacoes = Avaliacao.objects.filter(professor__escola=escola).count()
    total_correcoes = Resultado.objects.filter(avaliacao__professor__escola=escola).count()
    total_alunos = Aluno.objects.filter(professor__escola=escola).count()

    avaliacoes_recentes = Avaliacao.objects.filter(
        professor__escola=escola
    ).select_related('professor').order_by('-data_criacao')[:10]

    context = {
        'escola': escola,
        'total_professores': professores.count(),
        'total_avaliacoes': total_avaliacoes,
        'total_correcoes': total_correcoes,
        'total_alunos': total_alunos,
        'professores': professores[:20],
        'avaliacoes_recentes': avaliacoes_recentes,
    }
    return render(request, 'acesso/dashboard_coordenador.html', context)


# ---------------------------------------------------------------------------
# Gerenciar Usuários (ITA Admin)
# ---------------------------------------------------------------------------

@require_perfil('ita_admin')
def ita_usuarios(request):
    usuarios = Usuario.objects.select_related('escola').order_by('perfil', 'first_name')
    escolas = Escola.objects.filter(ativa=True).order_by('nome')

    if request.method == 'POST':
        acao = request.POST.get('acao')
        usuario_id = request.POST.get('usuario_id')

        if acao == 'alterar_perfil' and usuario_id:
            novo_perfil = request.POST.get('perfil')
            nova_escola_id = request.POST.get('escola_id') or None
            if novo_perfil in ('ita_admin', 'coordenador', 'professor', 'sem_grupo'):
                u = get_object_or_404(Usuario, pk=usuario_id)
                u.perfil = novo_perfil
                u.escola_id = nova_escola_id
                u.save(update_fields=['perfil', 'escola_id'])
                messages.success(request, f'Perfil de {u.get_full_name() or u.username} atualizado.')
            return redirect('ita_usuarios')

        if acao == 'criar_escola':
            nome_escola = request.POST.get('nome_escola', '').strip()
            if nome_escola:
                Escola.objects.get_or_create(nome=nome_escola, defaults={'codigo': nome_escola[:50]})
                messages.success(request, f'Escola "{nome_escola}" criada.')
            return redirect('ita_usuarios')

    return render(request, 'acesso/ita_usuarios.html', {
        'usuarios': usuarios,
        'escolas': escolas,
        'perfis': [('ita_admin', 'ITA Admin'), ('coordenador', 'Coordenador'),
                   ('professor', 'Professor'), ('sem_grupo', 'Sem Grupo')],
    })


# ---------------------------------------------------------------------------
# Impersonação — ITA Admin visualiza como outro usuário
# ---------------------------------------------------------------------------

@require_perfil('ita_admin')
def impersonar(request, usuario_id):
    """ITA Admin assume a sessão de outro usuário para diagnóstico."""
    alvo = get_object_or_404(Usuario, pk=usuario_id)
    if alvo.perfil == 'ita_admin':
        messages.error(request, 'Não é possível impersonar outro ITA Admin.')
        return redirect('ita_usuarios')

    # Guarda o admin original na sessão
    request.session['impersonar_admin_id'] = request.user.pk
    request.session['impersonar_nome'] = alvo.get_full_name() or alvo.username

    login(request, alvo, backend='django.contrib.auth.backends.ModelBackend')
    messages.info(request, f'Você está visualizando o sistema como "{request.session["impersonar_nome"]}".')
    return _redirecionar_por_perfil(alvo)


def parar_impersonar(request):
    """Encerra a impersonação e volta ao ITA Admin original."""
    admin_id = request.session.pop('impersonar_admin_id', None)
    request.session.pop('impersonar_nome', None)

    if admin_id:
        try:
            admin = Usuario.objects.get(pk=admin_id, perfil='ita_admin')
            login(request, admin, backend='django.contrib.auth.backends.ModelBackend')
            messages.success(request, 'Impersonação encerrada. Você está de volta como ITA Admin.')
            return redirect('ita_usuarios')
        except Usuario.DoesNotExist:
            pass
    return redirect('login')

# ---------------------------------------------------------------------------
# API: Todos os resultados (para ita_admin na plataforma ITA)
# ---------------------------------------------------------------------------

def api_resultados_todos(request):
    """
    Retorna todos os resultados de todos os professores em JSON.
    Inclui o campo 'id' (UUID) para buscar detalhe por questao.
    Protegido pela chave secreta — não requer login de sessão.
    """
    CHAVE_SECRETA = 'gamificaedu_secreto_2026'
    chave = request.GET.get('chave', '')
    if chave != CHAVE_SECRETA:
        from django.http import JsonResponse
        return JsonResponse({'erro': 'Chave inválida'}, status=403)

    from django.http import JsonResponse
    resultados = Resultado.objects.select_related('avaliacao', 'avaliacao__professor').order_by('-data_correcao')

    dados = []
    for r in resultados:
        gabarito = r.avaliacao.gabarito or {}
        respostas_aluno = r.respostas or {}
        questoes_detalhe = []
        for chave_q in sorted(gabarito.keys(), key=lambda x: int(x) if str(x).isdigit() else 0):
            resp = respostas_aluno.get(str(chave_q), None)
            gab = gabarito[chave_q]
            questoes_detalhe.append({
                'numero':        int(chave_q) if str(chave_q).isdigit() else chave_q,
                'resposta_aluno': resp if resp else '—',
                'gabarito':      gab,
                'acertou':       str(resp).upper() == str(gab).upper() if resp else False,
            })
        dados.append({
            'id':              str(r.id),
            'aluno':           r.aluno_nome,
            'turma':           r.turma,
            'avaliacao':       r.avaliacao.titulo,
            'disciplina':      r.avaliacao.disciplina if hasattr(r.avaliacao, 'disciplina') else '',
            'nota':            r.nota,
            'acertos':         r.acertos,
            'erros':           r.erros,
            'professor':       r.avaliacao.professor.email if r.avaliacao.professor else '',
            'data':            r.data_correcao.strftime('%d/%m/%Y') if r.data_correcao else '',
            'questoes_detalhe': questoes_detalhe,
        })

    return JsonResponse(dados, safe=False)


# ---------------------------------------------------------------------------
# API: Resultados do professor logado (para plataforma ITA — perfil professor)
# ---------------------------------------------------------------------------

def api_resultados_professor(request):
    """
    Retorna resultados de um professor específico em JSON, incluindo questoes_detalhe.
    Autenticado via email + chave secreta.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    CHAVE_SECRETA = 'gamificaedu_secreto_2026'
    chave = request.GET.get('chave', '')
    email = request.GET.get('email', '')
    if chave != CHAVE_SECRETA:
        return JsonResponse({'erro': 'Chave inválida'}, status=403)
    if not email:
        return JsonResponse({'erro': 'Email obrigatório'}, status=400)
    try:
        professor = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({'erro': 'Professor não encontrado'}, status=404)

    resultados = Resultado.objects.filter(avaliacao__professor=professor).select_related('avaliacao').order_by('-data_correcao')

    dados = []
    for r in resultados:
        gabarito = r.avaliacao.gabarito or {}
        respostas_aluno = r.respostas or {}
        questoes_detalhe = []
        for chave_q in sorted(gabarito.keys(), key=lambda x: int(x) if str(x).isdigit() else 0):
            resp = respostas_aluno.get(str(chave_q), None)
            gab = gabarito[chave_q]
            questoes_detalhe.append({
                'numero':        int(chave_q) if str(chave_q).isdigit() else chave_q,
                'resposta_aluno': resp if resp else '—',
                'gabarito':      gab,
                'acertou':       str(resp).upper() == str(gab).upper() if resp else False,
            })
        dados.append({
            'id':              str(r.id),
            'aluno':           r.aluno_nome,
            'turma':           r.turma,
            'avaliacao':       r.avaliacao.titulo,
            'disciplina':      r.avaliacao.disciplina if hasattr(r.avaliacao, 'disciplina') else '',
            'nota':            r.nota,
            'acertos':         r.acertos,
            'erros':           r.erros,
            'professor':       r.avaliacao.professor.email if r.avaliacao.professor else '',
            'data':            r.data_correcao.strftime('%d/%m/%Y') if r.data_correcao else '',
            'questoes_detalhe': questoes_detalhe,
        })

    return JsonResponse(dados, safe=False)


def api_resultado_detalhe(request, pk):
    """
    Retorna o detalhe questao por questao de um resultado especifico.
    Cruza respostas do aluno com gabarito da avaliacao.
    Protegido pela chave secreta.
    """
    CHAVE_SECRETA = 'gamificaedu_secreto_2026'
    chave = request.GET.get('chave', '')
    if chave != CHAVE_SECRETA:
        from django.http import JsonResponse
        return JsonResponse({'erro': 'Chave inválida'}, status=403)

    from django.http import JsonResponse
    try:
        resultado = Resultado.objects.select_related('avaliacao').get(pk=pk)
    except Resultado.DoesNotExist:
        return JsonResponse({'erro': 'Resultado não encontrado'}, status=404)

    gabarito = resultado.avaliacao.gabarito or {}
    respostas_aluno = resultado.respostas or {}

    questoes = []
    chaves_ordenadas = sorted(gabarito.keys(), key=lambda x: int(x) if str(x).isdigit() else 0)
    for chave_q in chaves_ordenadas:
        resp_aluno = respostas_aluno.get(str(chave_q), None)
        gab = gabarito[chave_q]
        questoes.append({
            'numero':         int(chave_q) if str(chave_q).isdigit() else chave_q,
            'resposta_aluno': resp_aluno,
            'gabarito':       gab,
            'acertou':        resp_aluno == gab if resp_aluno is not None else None,
        })

    dados = {
        'id':         str(resultado.id),
        'aluno':      resultado.aluno_nome,
        'turma':      resultado.turma,
        'avaliacao':  resultado.avaliacao.titulo,
        'disciplina': resultado.avaliacao.disciplina if hasattr(resultado.avaliacao, 'disciplina') else '',
        'nota':       resultado.nota,
        'acertos':    resultado.acertos,
        'erros':      resultado.erros,
        'questoes':   questoes,
    }
    return JsonResponse(dados)


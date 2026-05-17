import json
import csv
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.admin.views.decorators import staff_member_required
from django.utils import timezone

from .models import Inscricao
from .forms import InscricaoForm
from .utils.pagamento import criar_pedido_pagseguro, webhook_pagseguro_handler
from .utils.certificado import gerar_certificado_pdf, gerar_certificado_svg
from .utils.email_utils import enviar_email_confirmacao, enviar_certificado_email

VAGAS_TOTAL = 30
CHAVE_API_INTERNA = 'gamificaedu_secreto_2026'


def _vagas_usadas():
    return Inscricao.objects.filter(status__in=['pago', 'certificado_emitido']).count()


DIAS_PROGRAMA = [
    {'dia': 'Dia 1', 'icon': '🔬', 'titulo': 'Mundo Maker & Eletrônica Básica',
     'desc': 'Componentes, circuitos, lei de Ohm e primeira montagem'},
    {'dia': 'Dia 2', 'icon': '⚡', 'titulo': 'Arduino na Prática',
     'desc': 'Programação em blocos e C++ — semáforo, alarme e sensor'},
    {'dia': 'Dia 3', 'icon': '🤖', 'titulo': 'Robótica e Movimento',
     'desc': 'Servo motores, sensores ultrassônicos e robô autônomo'},
    {'dia': 'Dia 4', 'icon': '📡', 'titulo': 'ESP32 & Controle Sem Fio',
     'desc': 'Wi-Fi, Bluetooth e app no celular para controlar o projeto'},
    {'dia': 'Dia 5', 'icon': '🏆', 'titulo': 'Demo Day — Mostra Maker',
     'desc': 'Apresentação do projeto final para família e convidados'},
]


def landing_page(request):
    vagas_disp = VAGAS_TOTAL - _vagas_usadas()
    return render(request, 'inscricoes/landing.html', {
        'vagas_disponiveis': vagas_disp,
        'vagas_total': VAGAS_TOTAL,
        'dias_programa': DIAS_PROGRAMA,
    })


def formulario_inscricao(request):
    if _vagas_usadas() >= VAGAS_TOTAL:
        return redirect('inscricoes:lista_espera')

    if request.method == 'POST':
        form = InscricaoForm(request.POST)
        if form.is_valid():
            inscricao = form.save(commit=False)
            inscricao.status = 'aguardando_pagamento'
            inscricao.save()
            return redirect('inscricoes:pagamento', codigo=inscricao.codigo_inscricao)
    else:
        form = InscricaoForm()

    vagas_disp = VAGAS_TOTAL - _vagas_usadas()
    return render(request, 'inscricoes/formulario.html', {
        'form': form,
        'vagas_disponiveis': vagas_disp,
        'vagas_total': VAGAS_TOTAL,
    })


def pagamento_inscricao(request, codigo):
    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)

    if inscricao.status in ('pago', 'certificado_emitido'):
        return redirect('inscricoes:confirmado', codigo=codigo)

    link_pagamento = None
    erro = None

    try:
        resultado = criar_pedido_pagseguro(inscricao)
        inscricao.id_transacao_pag = resultado['id_pedido']
        inscricao.save(update_fields=['id_transacao_pag'])
        link_pagamento = resultado['link_pagamento']
    except Exception as e:
        erro = str(e)

    return render(request, 'inscricoes/pagamento.html', {
        'inscricao': inscricao,
        'link_pagamento': link_pagamento,
        'erro': erro,
    })


@csrf_exempt
def webhook_pagseguro(request):
    if request.method != 'POST':
        return JsonResponse({'erro': 'método inválido'}, status=405)
    return webhook_pagseguro_handler(request)


def pagamento_confirmado(request, codigo):
    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)

    if inscricao.status == 'aguardando_pagamento' and inscricao.id_transacao_pag:
        from .utils.pagamento import verificar_status_pedido
        status_api = verificar_status_pedido(inscricao.id_transacao_pag)
        if status_api == 'PAID':
            inscricao.status = 'pago'
            inscricao.data_pagamento = timezone.now()
            inscricao.save()
            try:
                enviar_email_confirmacao(inscricao)
            except Exception:
                pass

    return render(request, 'inscricoes/confirmado.html', {'inscricao': inscricao})


def gerar_certificado(request, codigo):
    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)

    if inscricao.status not in ('pago', 'certificado_emitido'):
        return render(request, 'inscricoes/confirmado.html', {
            'inscricao': inscricao,
            'erro_cert': 'Inscrição ainda não confirmada como paga.',
        })

    if not inscricao.certificado_gerado:
        inscricao.certificado_gerado = True
        inscricao.status = 'certificado_emitido'
        inscricao.data_certificado = timezone.now()
        inscricao.save()

    try:
        pdf_bytes = gerar_certificado_pdf(inscricao)
    except Exception as e:
        return HttpResponse(f'Erro ao gerar certificado: {e}', status=500)

    nome_arquivo = (
        f"certificado_maker_{inscricao.nome_completo.replace(' ', '_').lower()}.pdf"
    )
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{nome_arquivo}"'
    return response


def visualizar_certificado(request, codigo):
    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)
    svg_content = gerar_certificado_svg(inscricao)
    return render(request, 'inscricoes/certificado.html', {
        'inscricao': inscricao,
        'svg': svg_content,
    })


def verificar_certificado(request, codigo=None):
    resultado = None
    codigo_busca = codigo or request.GET.get('codigo', '').strip()

    if codigo_busca:
        try:
            todas = Inscricao.objects.filter(certificado_gerado=True)
            encontrada = next(
                (i for i in todas if str(i.codigo_inscricao).upper().startswith(codigo_busca.upper())),
                None
            )
            if encontrada:
                resultado = {'valido': True, 'inscricao': encontrada}
            else:
                resultado = {'valido': False}
        except Exception:
            resultado = {'valido': False}

    return render(request, 'inscricoes/verificar.html', {
        'resultado': resultado,
        'codigo_busca': codigo_busca,
    })


def verificar_vagas(request):
    usadas = _vagas_usadas()
    return JsonResponse({
        'vagas_total': VAGAS_TOTAL,
        'vagas_usadas': usadas,
        'vagas_disponiveis': VAGAS_TOTAL - usadas,
        'lotado': usadas >= VAGAS_TOTAL,
    })


def lista_espera(request):
    return render(request, 'inscricoes/lista_espera.html')


@staff_member_required
def painel_admin(request):
    inscricoes = Inscricao.objects.all()
    pagas = inscricoes.filter(status__in=['pago', 'certificado_emitido'])
    receita = sum(float(i.valor_pago) for i in pagas)

    stats = {
        'total': inscricoes.count(),
        'pagas': pagas.count(),
        'pendentes': inscricoes.filter(status='aguardando_pagamento').count(),
        'certificados': inscricoes.filter(certificado_gerado=True).count(),
        'vagas_restantes': VAGAS_TOTAL - pagas.count(),
        'receita': receita,
    }

    from django.db.models.functions import TruncDate
    from django.db.models import Count
    from datetime import timedelta
    hoje = timezone.now().date()
    quinze_dias_atras = hoje - timedelta(days=14)
    por_dia = (
        inscricoes
        .filter(data_inscricao__date__gte=quinze_dias_atras)
        .annotate(dia=TruncDate('data_inscricao'))
        .values('dia')
        .annotate(total=Count('id'))
        .order_by('dia')
    )
    grafico_labels = [str(d['dia']) for d in por_dia]
    grafico_dados = [d['total'] for d in por_dia]

    return render(request, 'inscricoes/admin_painel.html', {
        'inscricoes': inscricoes,
        'stats': stats,
        'grafico_labels': json.dumps(grafico_labels),
        'grafico_dados': json.dumps(grafico_dados),
    })


@staff_member_required
def exportar_csv(request):
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = 'attachment; filename="inscricoes_maker.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Código', 'Nome Aluno', 'Nascimento', 'Escola', 'Série',
        'Nível', 'Turno', 'Responsável', 'Telefone', 'E-mail',
        'CPF', 'Status', 'Data Inscrição', 'Data Pagamento',
        'Valor', 'Certificado',
    ])

    for i in Inscricao.objects.all():
        writer.writerow([
            i.codigo_curto(),
            i.nome_completo,
            i.data_nascimento.strftime('%d/%m/%Y'),
            i.escola,
            i.serie,
            i.get_nivel_experiencia_display(),
            i.get_turno_display(),
            i.nome_responsavel,
            i.telefone_formatado(),
            i.email,
            i.cpf_responsavel,
            i.get_status_display(),
            i.data_inscricao.strftime('%d/%m/%Y %H:%M'),
            i.data_pagamento.strftime('%d/%m/%Y %H:%M') if i.data_pagamento else '',
            f'R$ {i.valor_pago}',
            'Sim' if i.certificado_gerado else 'Não',
        ])

    return response


@staff_member_required
@require_POST
def emitir_certificado_admin(request, codigo):
    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)

    if inscricao.status not in ('pago', 'certificado_emitido'):
        return JsonResponse({'erro': 'Inscrição não está paga.'}, status=400)

    if not inscricao.certificado_gerado:
        inscricao.certificado_gerado = True
        inscricao.status = 'certificado_emitido'
        inscricao.data_certificado = timezone.now()
        inscricao.save()

    try:
        pdf_bytes = gerar_certificado_pdf(inscricao)
        enviar_certificado_email(inscricao, pdf_bytes)
        return JsonResponse({'status': 'ok', 'mensagem': 'Certificado emitido e enviado por e-mail.'})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)


def api_lista_inscricoes(request):
    """API JSON consumida pelo painel React — lista todas as inscrições."""
    chave = request.GET.get('chave') or request.headers.get('X-Chave', '')
    if chave != CHAVE_API_INTERNA:
        return JsonResponse({'erro': 'não autorizado'}, status=403)

    inscricoes = Inscricao.objects.all().order_by('-data_inscricao')
    dados = []
    for i in inscricoes:
        dados.append({
            'id': str(i.codigo_inscricao),
            'codigo': i.codigo_curto(),
            'nome': i.nome_completo,
            'escola': i.escola,
            'serie': i.serie,
            'turno': i.get_turno_display(),
            'responsavel': i.nome_responsavel,
            'telefone': i.telefone_formatado(),
            'email': i.email,
            'status': i.status,
            'status_display': i.get_status_display(),
            'data_inscricao': i.data_inscricao.strftime('%d/%m/%Y %H:%M'),
            'valor': float(i.valor_pago),
            'certificado_gerado': i.certificado_gerado,
        })

    pagas = sum(1 for i in dados if i['status'] in ('pago', 'certificado_emitido'))
    pendentes = sum(1 for i in dados if i['status'] == 'aguardando_pagamento')
    receita = sum(i['valor'] for i in dados if i['status'] in ('pago', 'certificado_emitido'))

    return JsonResponse({
        'inscricoes': dados,
        'stats': {
            'total': len(dados),
            'pagas': pagas,
            'pendentes': pendentes,
            'vagas_restantes': VAGAS_TOTAL - pagas,
            'receita': receita,
        }
    })


@csrf_exempt
def api_editar_inscricao(request, codigo):
    """Edita dados de uma inscrição via painel React."""
    if request.method != 'POST':
        return JsonResponse({'erro': 'método inválido'}, status=405)
    chave = request.GET.get('chave') or request.headers.get('X-Chave', '')
    if chave != CHAVE_API_INTERNA:
        return JsonResponse({'erro': 'não autorizado'}, status=403)

    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)
    try:
        dados = json.loads(request.body or b'{}')
    except Exception:
        return JsonResponse({'erro': 'JSON inválido'}, status=400)

    campos_permitidos = ['nome_completo', 'escola', 'serie', 'turno',
                         'nome_responsavel', 'telefone', 'email', 'status']
    for campo in campos_permitidos:
        if campo in dados:
            setattr(inscricao, campo, dados[campo])

    if dados.get('status') == 'pago' and not inscricao.data_pagamento:
        inscricao.data_pagamento = timezone.now()

    inscricao.save()
    return JsonResponse({'status': 'ok'})


@csrf_exempt
def api_excluir_inscricao(request, codigo):
    """Exclui uma inscrição via painel React."""
    if request.method != 'DELETE':
        return JsonResponse({'erro': 'método inválido'}, status=405)
    chave = request.GET.get('chave') or request.headers.get('X-Chave', '')
    if chave != CHAVE_API_INTERNA:
        return JsonResponse({'erro': 'não autorizado'}, status=403)

    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)
    inscricao.delete()
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@require_POST
def api_marcar_pago_react(request, codigo):
    """Marca inscrição como paga via painel React — usa chave interna."""
    chave = request.GET.get('chave') or request.headers.get('X-Chave', '')
    if chave != CHAVE_API_INTERNA:
        return JsonResponse({'erro': 'não autorizado'}, status=403)

    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)
    if inscricao.status not in ('pago', 'certificado_emitido'):
        inscricao.status = 'pago'
        inscricao.data_pagamento = timezone.now()
        inscricao.referencia_pag = 'MANUAL-PAINEL'
        inscricao.save()
        try:
            enviar_email_confirmacao(inscricao)
        except Exception:
            pass
    return JsonResponse({'status': 'ok', 'nome': inscricao.nome_completo})


@staff_member_required
@require_POST
def marcar_como_pago(request, codigo):
    inscricao = get_object_or_404(Inscricao, codigo_inscricao=codigo)
    if inscricao.status not in ('pago', 'certificado_emitido'):
        inscricao.status = 'pago'
        inscricao.data_pagamento = timezone.now()
        inscricao.referencia_pag = 'MANUAL'
        inscricao.save()
        try:
            enviar_email_confirmacao(inscricao)
        except Exception:
            pass
    return JsonResponse({'status': 'ok'})

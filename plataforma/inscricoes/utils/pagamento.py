import requests
from django.conf import settings


def _base_url():
    if getattr(settings, 'PAGSEGURO_SANDBOX', True):
        return 'https://sandbox.api.pagseguro.com'
    return 'https://api.pagseguro.com'


def _headers():
    return {
        'Authorization': f'Bearer {settings.PAGSEGURO_TOKEN}',
        'Content-Type': 'application/json',
    }


def _telefone_parts(telefone_str):
    digitos = ''.join(c for c in telefone_str if c.isdigit())
    area = digitos[:2]
    numero = digitos[2:]
    return area, numero


def criar_pedido_pagseguro(inscricao):
    area, numero = _telefone_parts(inscricao.telefone)
    cpf_limpo = ''.join(c for c in inscricao.cpf_responsavel if c.isdigit())
    base_url = getattr(settings, 'BASE_URL', 'https://itatecnologiaeducacional.tech')

    payload = {
        'reference_id': str(inscricao.codigo_inscricao),
        'customer': {
            'name': inscricao.nome_responsavel,
            'email': inscricao.email,
            'tax_id': cpf_limpo,
            'phones': [{
                'country': '55',
                'area': area,
                'number': numero,
                'type': 'MOBILE',
            }],
        },
        'items': [{
            'reference_id': 'CURSO-MAKER-2026',
            'name': 'Curso de Férias Maker — CEITEC Itapipoca',
            'quantity': 1,
            'unit_amount': 19900,
        }],
        'payment_methods': [
            {'type': 'PIX'},
            {'type': 'CREDIT_CARD'},
            {'type': 'BOLETO'},
        ],
        'payment_methods_configs': [
            {
                'type': 'CREDIT_CARD',
                'config_options': [
                    {'option': 'INSTALLMENTS_LIMIT', 'value': '3'},
                    {'option': 'NO_INTEREST_INSTALLMENTS_LIMIT', 'value': '3'},
                ],
            }
        ],
        'notification_urls': [
            f"{base_url}/inscricao/pagamento/notificacao/",
        ],
        'redirect_url': f"{base_url}/inscricao/pagamento/confirmado/{inscricao.codigo_inscricao}/",
    }

    try:
        response = requests.post(
            f'{_base_url()}/orders',
            headers=_headers(),
            json=payload,
            timeout=30,
        )
    except requests.Timeout:
        raise Exception('PagSeguro: tempo de resposta esgotado. Tente novamente.')
    except requests.RequestException as e:
        raise Exception(f'PagSeguro: erro de conexão — {e}')

    if response.status_code == 201:
        data = response.json()
        link_pag = next(
            (lnk['href'] for lnk in data.get('links', []) if lnk.get('rel') == 'PAY'),
            None
        )
        if not link_pag:
            links = data.get('links', [])
            link_pag = links[0]['href'] if links else None

        return {
            'id_pedido': data.get('id', ''),
            'link_pagamento': link_pag,
            'status': 'criado',
        }
    else:
        raise Exception(
            f'PagSeguro: erro {response.status_code} — {response.text[:300]}'
        )


def verificar_status_pedido(id_pedido):
    try:
        response = requests.get(
            f'{_base_url()}/orders/{id_pedido}',
            headers=_headers(),
            timeout=20,
        )
        if response.status_code == 200:
            data = response.json()
            charges = data.get('charges', [])
            if charges:
                return charges[0].get('status', 'PENDING')
            return data.get('status', 'PENDING')
    except requests.RequestException:
        pass
    return 'ERRO'


def webhook_pagseguro_handler(request):
    import json
    from django.http import JsonResponse
    from django.utils import timezone
    from inscricoes.models import Inscricao
    from inscricoes.utils.email_utils import enviar_email_confirmacao

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'erro': 'payload inválido'}, status=400)

    referencia = payload.get('reference_id', '')
    charges = payload.get('charges', [{}])
    status_pag = charges[0].get('status', '') if charges else ''
    id_transacao = charges[0].get('id', '') if charges else ''

    try:
        inscricao = Inscricao.objects.get(codigo_inscricao=referencia)
    except (Inscricao.DoesNotExist, Exception):
        return JsonResponse({'status': 'referencia_desconhecida'})

    if status_pag == 'PAID' and inscricao.status != 'pago':
        inscricao.status = 'pago'
        inscricao.data_pagamento = timezone.now()
        inscricao.id_transacao_pag = id_transacao
        inscricao.save()
        try:
            enviar_email_confirmacao(inscricao)
        except Exception:
            pass
    elif status_pag in ('DECLINED', 'CANCELED'):
        inscricao.status = 'cancelado'
        inscricao.save()

    return JsonResponse({'status': 'ok'})

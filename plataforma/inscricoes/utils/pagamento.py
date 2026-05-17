import mercadopago
from django.conf import settings


def _sdk():
    return mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)


def criar_pedido_mercadopago(inscricao):
    """
    Cria uma preferência de pagamento no Mercado Pago.
    Retorna o link de checkout (init_point) e o ID da preferência.
    Aceita PIX, Cartão de Crédito (até 3x sem juros) e Boleto.
    """
    base_url = getattr(settings, 'BASE_URL', 'https://itatecnologiaeducacional.tech')

    nome_partes = inscricao.nome_responsavel.split()
    primeiro_nome = nome_partes[0] if nome_partes else inscricao.nome_responsavel
    sobrenome = ' '.join(nome_partes[1:]) if len(nome_partes) > 1 else ''

    preference_data = {
        "items": [{
            "id": "CURSO-MAKER-2026",
            "title": "Curso de Férias Maker — CEITEC Itapipoca",
            "description": "Alunos Maker Não Tiram Férias · Julho 2026 · 40h",
            "quantity": 1,
            "currency_id": "BRL",
            "unit_price": float(inscricao.valor_pago),
        }],
        "payer": {
            "name": primeiro_nome,
            "surname": sobrenome,
            "email": inscricao.email,
        },
        "back_urls": {
            "success": f"{base_url}/inscricao/pagamento/confirmado/{inscricao.codigo_inscricao}/",
            "failure": f"{base_url}/inscricao/pagamento/{inscricao.codigo_inscricao}/",
            "pending": f"{base_url}/inscricao/pagamento/confirmado/{inscricao.codigo_inscricao}/",
        },
        "auto_return": "approved",
        "notification_url": f"{base_url}/inscricao/pagamento/notificacao/",
        "external_reference": str(inscricao.codigo_inscricao),
        "statement_descriptor": "CEITEC MAKER",
        "payment_methods": {
            "installments": 3,
            "default_installments": 1,
        },
    }

    sdk = _sdk()
    result = sdk.preference().create(preference_data)
    response = result.get("response", {})
    status = result.get("status")

    if status not in (200, 201):
        erro = response.get("message") or str(response)
        raise Exception(f"Mercado Pago: erro {status} — {erro}")

    # Em sandbox usa sandbox_init_point; em produção usa init_point
    link = response.get("init_point") or response.get("sandbox_init_point")

    return {
        "id_pedido": response.get("id", ""),
        "link_pagamento": link,
        "status": "criado",
    }


# Mantém o nome antigo como alias para não quebrar views.py
criar_pedido_pagseguro = criar_pedido_mercadopago


def verificar_status_pedido(preference_id):
    """
    Consulta pagamentos vinculados a uma referência externa.
    Retorna 'PAID', 'PENDING' ou 'ERRO'.
    """
    try:
        sdk = _sdk()
        # Busca pagamentos pela external_reference (UUID da inscrição)
        result = sdk.payment().search({"external_reference": preference_id})
        response = result.get("response", {})
        resultados = response.get("results", [])
        if resultados:
            status = resultados[0].get("status", "pending")
            if status == "approved":
                return "PAID"
            if status in ("cancelled", "rejected"):
                return "DECLINED"
            return "PENDING"
    except Exception:
        pass
    return "ERRO"


def webhook_pagseguro_handler(request):
    """
    Processa notificações IPN/Webhook do Mercado Pago.
    MP envia POST com query params: type=payment&data.id=<id>
    ou JSON com {"type": "payment", "data": {"id": "..."}}.
    """
    import json
    from django.http import JsonResponse
    from django.utils import timezone
    from inscricoes.models import Inscricao
    from inscricoes.utils.email_utils import enviar_email_confirmacao

    # Tenta ler o payment_id do body JSON ou dos query params
    payment_id = None
    try:
        body = json.loads(request.body or b'{}')
        if body.get("type") == "payment":
            payment_id = str(body.get("data", {}).get("id", ""))
    except (json.JSONDecodeError, ValueError):
        pass

    if not payment_id:
        payment_id = request.GET.get("data.id") or request.POST.get("data_id", "")

    if not payment_id:
        return JsonResponse({"status": "sem_payment_id"})

    # Consulta detalhes do pagamento
    try:
        sdk = _sdk()
        result = sdk.payment().get(payment_id)
        pagamento = result.get("response", {})
    except Exception:
        return JsonResponse({"status": "erro_consulta"})

    status_mp = pagamento.get("status", "")
    referencia = str(pagamento.get("external_reference", ""))

    if not referencia:
        return JsonResponse({"status": "sem_referencia"})

    try:
        inscricao = Inscricao.objects.get(codigo_inscricao=referencia)
    except (Inscricao.DoesNotExist, Exception):
        return JsonResponse({"status": "referencia_desconhecida"})

    if status_mp == "approved" and inscricao.status not in ("pago", "certificado_emitido"):
        inscricao.status = "pago"
        inscricao.data_pagamento = timezone.now()
        inscricao.id_transacao_pag = payment_id
        inscricao.save()
        try:
            enviar_email_confirmacao(inscricao)
        except Exception:
            pass

    elif status_mp in ("cancelled", "rejected"):
        if inscricao.status not in ("pago", "certificado_emitido"):
            inscricao.status = "cancelado"
            inscricao.save()

    return JsonResponse({"status": "ok"})

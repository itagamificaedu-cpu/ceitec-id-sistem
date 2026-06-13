from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
import json
import mercadopago


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_unificado(request):
    """Retorna dados agregados de todos os sistemas para o dashboard React."""
    from gamificaedu.gamification.models import GamificacaoPerfil, Missao
    from gamificaedu.ferramentas.models import Ferramenta
    from corretor.core.models import Avaliacao, Resultado

    user = request.user

    try:
        gamificacao = user.gamificacao
        gamificacao_data = {
            'xp': gamificacao.xp,
            'nivel': gamificacao.nivel,
            'streak': gamificacao.streak,
        }
    except Exception:
        gamificacao_data = {'xp': 0, 'nivel': 1, 'streak': 0}

    tenant = getattr(user, 'tenant', None)

    missoes_ativas = Missao.objects.filter(ativa=True).count() if tenant else 0

    avaliacoes_mes = Avaliacao.objects.filter(
        professor=None  # professor do corretor é outro model — ajuste pós-migração
    ).count() if tenant else 0

    ferramentas = Ferramenta.objects.filter(ativo=True).count() if tenant else 0

    return Response({
        'professor': {
            'nome': user.get_full_name() or user.email,
            'email': user.email,
            'plano': user.plano,
            'escola': getattr(user, 'escola', ''),
        },
        'gamificacao': gamificacao_data,
        'missoes_ativas': missoes_ativas,
        'ferramentas_repositorio': ferramentas,
        'sistema': 'ITA TECNOLOGIA EDUCACIONAL v3.0',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_professores(request):
    from gamificaedu.accounts.models import Professor
    tenant = getattr(request.user, 'tenant', None)
    qs = Professor.objects.filter(tenant=tenant) if tenant else Professor.objects.none()
    data = [{'id': p.id, 'nome': p.get_full_name(), 'email': p.email, 'plano': p.plano} for p in qs]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalhe_professor(request, pk):
    from gamificaedu.accounts.models import Professor
    try:
        p = Professor.objects.get(pk=pk)
        return Response({'id': p.id, 'nome': p.get_full_name(), 'email': p.email, 'plano': p.plano, 'escola': p.escola})
    except Professor.DoesNotExist:
        return Response({'erro': 'Professor não encontrado'}, status=404)


@api_view(['GET'])
@permission_classes([AllowAny])
def lista_planos(request):
    return Response({
        'planos': [
            {
                'id': 'professor',
                'nome': 'Plano Professor',
                'preco': 29.00,
                'periodo': 'mês',
                'recursos': [
                    'ItagGame completo',
                    'Corretor de Provas',
                    'Repositório ilimitado',
                    'IA: Criador de questões (50/mês)',
                    'IA: Planos de aula (20/mês)',
                    'Gestão de 1 turma',
                ],
                'destaque': False,
            },
            {
                'id': 'escola',
                'nome': 'Plano Escola',
                'preco': 99.00,
                'periodo': 'mês',
                'recursos': [
                    'Tudo do Plano Professor',
                    'Múltiplas turmas e professores',
                    'Sistema QR Code de identificação',
                    'Controle de presença',
                    'IA ilimitada',
                    'Relatórios avançados',
                    'Suporte WhatsApp prioritário',
                ],
                'destaque': True,
            },
        ]
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assinar_plano(request, plano):
    sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
    planos = settings.PLANOS

    if plano not in planos:
        return Response({'erro': 'Plano inválido'}, status=400)

    info = planos[plano]
    base_url = request.build_absolute_uri('/').rstrip('/')

    preference_data = {
        'items': [{'title': info['nome'], 'quantity': 1, 'unit_price': info['preco']}],
        'payer': {'email': request.user.email},
        'back_urls': {
            'success': f'{base_url}/dashboard/',
            'failure': f'{base_url}/planos/',
            'pending': f'{base_url}/dashboard/',
        },
        'auto_return': 'approved',
        'external_reference': f'{request.user.id}_{plano}',
        'notification_url': f'{base_url}/api/webhook/mercadopago/',
    }

    resposta = sdk.preference().create(preference_data)
    link = resposta['response'].get('init_point', '')
    return Response({'link_pagamento': link})


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def webhook_mercadopago(request):
    from gamificaedu.accounts.models import Professor
    from gamificaedu.core.models import Assinatura
    from django.utils import timezone
    from datetime import timedelta

    data = request.data
    if data.get('type') == 'payment' and data.get('action') == 'payment.updated':
        sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
        payment_id = data['data']['id']
        payment = sdk.payment().get(payment_id)
        info = payment['response']

        if info.get('status') == 'approved':
            ref = info.get('external_reference', '')
            if '_' in ref:
                user_id, plano = ref.rsplit('_', 1)
                try:
                    prof = Professor.objects.get(pk=user_id)
                    prof.plano = plano
                    prof.plano_expira_em = timezone.now() + timedelta(days=30)
                    prof.save(update_fields=['plano', 'plano_expira_em'])
                    assinatura, _ = Assinatura.objects.get_or_create(usuario=prof, defaults={'tenant': prof.tenant})
                    assinatura.plano = plano
                    assinatura.ativo = True
                    assinatura.save(update_fields=['plano', 'ativo'])
                except Professor.DoesNotExist:
                    pass

    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil_gamificacao(request):
    from gamificaedu.gamification.models import GamificacaoPerfil, ConquistaUsuario
    try:
        perfil = request.user.gamificacao
        conquistas = ConquistaUsuario.objects.filter(usuario=request.user).select_related('conquista')
        return Response({
            'xp': perfil.xp,
            'nivel': perfil.nivel,
            'pontos': perfil.pontos,
            'streak': perfil.streak,
            'conquistas': [{'titulo': c.conquista.titulo, 'icone': c.conquista.icone} for c in conquistas],
        })
    except Exception:
        return Response({'xp': 0, 'nivel': 1, 'pontos': 0, 'streak': 0, 'conquistas': []})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_avaliacoes_corretor(request):
    from corretor.core.models import Avaliacao
    # No sistema unificado, o professor do corretor será mapeado via email
    # Por ora retorna lista vazia até migração completa dos dados
    return Response({'avaliacoes': [], 'nota': 'Migração de dados pendente — rode migrate_data.py'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lista_ferramentas(request):
    from gamificaedu.ferramentas.models import Ferramenta
    qs = Ferramenta.objects.filter(ativo=True).order_by('-criado_em')
    data = [{'id': f.id, 'titulo': f.titulo, 'descricao': f.descricao, 'categoria': f.categoria} for f in qs]
    return Response({'ferramentas': data})

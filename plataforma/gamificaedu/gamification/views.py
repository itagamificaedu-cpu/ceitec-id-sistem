from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import GamificacaoPerfil, Missao, Conquista


@login_required
def hub(request):
    """Página inicial do ItagGame — hub de gamificação."""
    try:
        perfil, _ = GamificacaoPerfil.objects.get_or_create(
            usuario=request.user,
            defaults={'tenant': getattr(request.user, 'tenant', None)},
        )
    except Exception:
        perfil = None

    missoes = Missao.objects.filter(ativa=True)[:5]
    ranking_top5 = GamificacaoPerfil.objects.order_by('-xp')[:5]

    payload = getattr(request, 'sso_payload', None)
    return render(request, 'gamification/hub.html', {
        'perfil': perfil,
        'missoes': missoes,
        'ranking_top5': ranking_top5,
        # Contexto para base_portal.html
        'usuario': request.user,
        'plano_atual': payload.get('plano', '') if payload else getattr(request.user, 'plano', ''),
        'dias_restantes': payload.get('dias_restantes', 0) if payload else 0,
    })


@login_required
def ranking_view(request):
    ranking = GamificacaoPerfil.objects.order_by('-xp')[:20]
    return render(request, 'gamification/ranking.html', {'ranking': ranking})

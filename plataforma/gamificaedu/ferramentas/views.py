from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Ferramenta


def _tem_acesso(request):
    """Verifica acesso via SSO ou plano do usuário."""
    payload = getattr(request, 'sso_payload', None)
    if payload:
        return 'repositorio' in payload.get('modulos', [])
    # Fallback: plano via ita_core
    try:
        plano_obj = request.user.tenant.plano_escola
        return 'repositorio' in plano_obj.modulos_liberados
    except Exception:
        pass
    # Fallback: plano legado
    try:
        return request.user.assinatura.plano in ['educador', 'colaborador']
    except Exception:
        pass
    # Usuário autenticado sem plano definido tem acesso trial
    return request.user.is_authenticated


@login_required
def lista(request):
    if not _tem_acesso(request):
        return redirect('/portal/')

    ferramentas = Ferramenta.objects.filter(ativo=True).order_by('-criado_em')
    return render(request, 'ferramentas/lista.html', {'ferramentas': ferramentas})


@login_required
def detalhe(request, pk=None, *args, **kwargs):
    if not _tem_acesso(request):
        return redirect('/portal/')

    try:
        ferramenta = Ferramenta.objects.get(pk=pk)
        return render(request, 'ferramentas/detalhe.html', {'ferramenta': ferramenta})
    except Ferramenta.DoesNotExist:
        return render(request, 'ferramentas/detalhe.html', {})

"""Middleware SSO — intercepta requisições e injeta escola/plano no request."""
from django.shortcuts import redirect
from django.urls import reverse
from . import sso

# Prefixos que não precisam de SSO
SSO_EXEMPT_PREFIXES = (
    '/login/',
    '/logout/',
    '/master/',
    '/admin/',
    '/django-admin/',
    '/api/',
    '/static/',
    '/media/',
    '/accounts/',
    '/__debug__/',
)

# Prefixos que exigem SSO ativo
SSO_REQUIRED_PREFIXES = (
    '/portal/',
    '/itagame/',
    '/corretor/',
    '/repositorio/',
    '/relatorios/',
    '/gestao-professores/',
)


class SSOMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # Rotas isentas
        if any(path.startswith(p) for p in SSO_EXEMPT_PREFIXES):
            request.sso_payload = None
            return self.get_response(request)

        # Tenta extrair e validar token SSO
        token = sso.obter_token_do_request(request)
        payload = sso.decodificar_token_sso(token) if token else None

        request.sso_payload = payload
        request.sso_token = token

        # Rotas que exigem SSO válido
        if any(path.startswith(p) for p in SSO_REQUIRED_PREFIXES):
            if not payload:
                # Se o usuário está autenticado no Django, gera payload a partir do plano
                if request.user.is_authenticated:
                    payload = _payload_do_usuario(request.user)
                    request.sso_payload = payload
                else:
                    return redirect(f'/login/?next={path}&msg=sessao_expirada')
            elif not _sessao_ativa_no_banco(token):
                resp = redirect(f'/login/?next={path}&msg=sessao_invalida')
                resp.delete_cookie('sso_token')
                return resp

        return self.get_response(request)


def _payload_do_usuario(usuario) -> dict:
    """Gera um payload SSO mínimo a partir do plano do usuário autenticado."""
    try:
        plano_obj = usuario.tenant.plano_escola
        return {
            'plano': plano_obj.plano,
            'modulos': plano_obj.modulos_liberados,
            'dias_restantes': plano_obj.dias_restantes,
        }
    except Exception:
        pass
    return {
        'plano': 'trial',
        'modulos': ['itagame', 'corretor', 'repositorio', 'configuracoes'],
        'dias_restantes': 0,
    }


def _sessao_ativa_no_banco(token: str) -> bool:
    try:
        from .models import SessaoSSO
        from django.utils import timezone
        return SessaoSSO.objects.filter(
            token=token, ativa=True, expira_em__gt=timezone.now()
        ).exists()
    except Exception:
        return True  # Em caso de erro de banco (ex: migration), não bloqueamos

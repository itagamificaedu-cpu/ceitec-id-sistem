"""Lógica central de Single Sign-On — geração e validação de tokens JWT."""
import jwt
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


SSO_EXPIRATION_HOURS = int(getattr(settings, 'SSO_TOKEN_EXPIRATION_HOURS', 8))


def gerar_token_sso(usuario, plano_info: dict) -> str:
    """Gera um JWT assinado para a sessão SSO da escola."""
    agora = timezone.now()
    payload = {
        'sub': str(usuario.pk),
        'email': usuario.email,
        'nome': usuario.get_full_name() or usuario.email,
        'tenant_id': str(usuario.tenant_id) if hasattr(usuario, 'tenant_id') else None,
        'plano': plano_info.get('plano', 'trial'),
        'modulos': plano_info.get('modulos', []),
        'iat': int(agora.timestamp()),
        'exp': int((agora + timedelta(hours=SSO_EXPIRATION_HOURS)).timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def decodificar_token_sso(token: str) -> dict | None:
    """Decodifica e valida o JWT. Retorna payload ou None se inválido/expirado."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def obter_token_do_request(request) -> str | None:
    """Extrai o token SSO do cookie ou do header Authorization."""
    token = request.COOKIES.get('sso_token')
    if not token:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
    return token or None


def modulo_liberado(payload: dict, modulo: str) -> bool:
    """Verifica se o payload SSO dá acesso ao módulo solicitado."""
    return modulo in payload.get('modulos', [])

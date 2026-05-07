import secrets
import hashlib
from datetime import timedelta
from django.utils import timezone


def gerar_token_seguro(avaliacao_id, aluno_id=None, horas_validade=24, max_usos=0):
    dados_base = f"{avaliacao_id}:{aluno_id or 'geral'}:{secrets.token_hex(32)}:{timezone.now().isoformat()}"
    token_hash = hashlib.sha256(dados_base.encode()).hexdigest()
    token_curto = secrets.token_urlsafe(24)
    token_final = f"{token_curto}_{token_hash[:16]}"
    expira_em = timezone.now() + timedelta(hours=horas_validade)
    return token_final, expira_em


def validar_token(token):
    from .models import TokenQR
    try:
        token_obj = TokenQR.objects.select_related('avaliacao', 'aluno').get(token=token)
        if not token_obj.esta_valido():
            return None, "Token expirado ou inválido"
        return token_obj, None
    except TokenQR.DoesNotExist:
        return None, "Token não encontrado"
    except Exception as e:
        return None, f"Erro ao validar token: {str(e)}"

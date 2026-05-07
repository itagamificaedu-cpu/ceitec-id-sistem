import threading
from django.http import JsonResponse
from django.shortcuts import redirect
from .models import Tenant

_tenant_context = threading.local()

def get_current_tenant():
    return getattr(_tenant_context, 'tenant', None)

def set_current_tenant(tenant):
    _tenant_context.tenant = tenant

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Excluir URLs públicas (login, registro, admin)
        excluded_paths = [
            '/admin/',
            '/accounts/login/',
            '/accounts/logout/',
            '/accounts/register/',
            '/accounts/password_reset/',
            '/static/',
            '/media/',
        ]
        
        # Verificar se o caminho está excluído
        if any(request.path.startswith(path) for path in excluded_paths):
            return self.get_response(request)
        
        # Tentar obter tenant do subdomínio ou header
        tenant = None
        host = request.get_host().split(':')[0]  # Remove porta se existir
        
        # Tentar identificar o tenant de forma blindada contra erros de banco
        try:
            # Tentar identificar tenant por subdomínio (ex: escola1.sistema.com)
            if host and '.' in host:
                subdomain = host.split('.')[0]
                if subdomain != 'www':
                    try:
                        tenant = Tenant.objects.get(dominio__iexact=host)
                    except Tenant.DoesNotExist:
                        try:
                            tenant = Tenant.objects.get(dominio__iexact=f"{subdomain}.sistema.com")
                        except Tenant.DoesNotExist:
                            pass
            
            # Se não encontrou por subdomínio, tentar header
            if not tenant:
                tenant_id = request.META.get('HTTP_X_TENANT_ID')
                if tenant_id:
                    try:
                        tenant = Tenant.objects.get(id=tenant_id)
                    except (Tenant.DoesNotExist, ValueError):
                        pass
            
            # Se ainda não encontrou, tentar do usuário autenticado
            if not tenant and request.user.is_authenticated:
                # Para Professor
                if hasattr(request.user, 'tenant'):
                    tenant = request.user.tenant
        except Exception as e:
            # Se a tabela não existir ainda (durante migration), ignora
            pass
        
        # Definir tenant no request e no contexto global
        request.tenant = tenant
        set_current_tenant(tenant)
        
        # Identificação de tenant sem bloqueio (SSO cuida do controle de acesso)
        # Nota: reverse('home') removido — rota centralizada no ita_core
        
        response = self.get_response(request)
        
        # Limpar contexto
        set_current_tenant(None)
        
        return response
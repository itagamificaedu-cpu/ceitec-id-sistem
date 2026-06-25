from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages


def require_perfil(*perfis):
    """Decorator que restringe a view a usuários com determinado perfil (type_user)."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('login')
            user_perfil = getattr(request.user, 'type_user', None) or getattr(request.user, 'perfil', None)
            if user_perfil not in perfis and not request.user.is_superuser:
                messages.error(request, 'Acesso negado.')
                return redirect('corretor_home')
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

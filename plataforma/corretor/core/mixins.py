from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages


def require_perfil(*perfis):
    """Decorator que restringe acesso por perfil/tipo do usuário.

    Mapeia tanto 'perfil' (legado) quanto 'type_user' (modelo atual Professor).
    """
    MAPA = {
        'ita_admin':   ('admin', 'ita_admin'),
        'coordenador': ('school', 'coordenador'),
        'professor':   ('prof', 'professor'),
    }

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('login')

            user = request.user
            # Superusuário sempre passa
            if getattr(user, 'is_superuser', False):
                return view_func(request, *args, **kwargs)

            type_user  = getattr(user, 'type_user', '')
            perfil_leg = getattr(user, 'perfil', '')

            for p in perfis:
                aceitos = MAPA.get(p, (p,))
                if type_user in aceitos or perfil_leg in aceitos:
                    return view_func(request, *args, **kwargs)

            messages.error(request, 'Você não tem permissão para acessar esta página.')
            return redirect('sem_acesso')

        return _wrapped
    return decorator

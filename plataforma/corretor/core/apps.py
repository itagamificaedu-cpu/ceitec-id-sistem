from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'corretor.core'
    label = 'corretor_core'
    verbose_name = 'Corretor de Provas'

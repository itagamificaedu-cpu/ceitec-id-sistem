from django.core.management.base import BaseCommand
from core.models import Usuario


class Command(BaseCommand):
    help = 'Cria usuário admin padrão'

    def handle(self, *args, **options):
        if not Usuario.objects.filter(username='admin').exists():
            Usuario.objects.create_superuser(
                username='admin',
                email='admin@correcaoonline.com',
                password='admin123',
                first_name='Admin',
                tipo_usuario='admin'
            )
            self.stdout.write(self.style.SUCCESS('Usuário admin criado com sucesso!'))
            self.stdout.write('Username: admin')
            self.stdout.write('Senha: admin123')
        else:
            self.stdout.write(self.style.WARNING('Usuário admin já existe'))

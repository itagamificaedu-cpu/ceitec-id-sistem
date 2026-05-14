"""
Management command: criar_ita_admin
====================================
Define um usuário existente (por email) como ITA Admin (type_user='admin'),
ou cria um novo usuário admin se ainda não existir.

Uso:
    python manage.py criar_ita_admin itagamificaedu@gmail.com
    python manage.py criar_ita_admin itagamificaedu@gmail.com --senha MinhaS3nha!
    python manage.py criar_ita_admin itagamificaedu@gmail.com --nome "Genezio Silva"
"""
import getpass

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Define (ou cria) um usuário como ITA Admin no sistema central.'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='E-mail do usuário')
        parser.add_argument('--senha',  dest='senha',  default=None,
                            help='Senha (omitir para digitar interativamente)')
        parser.add_argument('--nome',   dest='nome',   default=None,
                            help='Primeiro nome (usado na criação)')
        parser.add_argument('--is-superuser', action='store_true', default=False,
                            help='Também marca is_superuser e is_staff')

    def handle(self, *args, **options):
        User = get_user_model()
        email = options['email'].strip().lower()
        senha = options['senha']
        nome  = options['nome'] or email.split('@')[0].capitalize()
        is_su = options['is_superuser']

        try:
            usuario = User.objects.get(email=email)
            criado  = False
        except User.DoesNotExist:
            criado = True
            if not senha:
                senha = getpass.getpass(f'Senha para o novo usuário {email}: ')
            if not senha:
                raise CommandError('Uma senha é obrigatória para criar novo usuário.')

            usuario = User.objects.create_user(
                username=email,
                email=email,
                password=senha,
                first_name=nome,
                is_active=True,
                email_confirmado=True if hasattr(User, 'email_confirmado') else None,
                status_aprovacao='aprovado' if hasattr(User, 'status_aprovacao') else None,
            )
            self.stdout.write(f'  ✅ Usuário criado: {email}')

        # Atualiza campos de perfil
        usuario.type_user = 'admin'
        usuario.is_staff  = True    # permite acesso ao Django Admin (/admin/)

        if is_su:
            usuario.is_superuser = True

        if senha and not criado:
            usuario.set_password(senha)
            self.stdout.write('  🔑 Senha atualizada.')

        usuario.save()

        acao = 'criado como' if criado else 'promovido a'
        self.stdout.write(self.style.SUCCESS(
            f'\n🛡️  {email} foi {acao} ITA Admin com sucesso!\n'
            f'   type_user  = admin\n'
            f'   is_staff   = True\n'
            f'   is_superuser = {usuario.is_superuser}\n'
            f'\n   Acesso → https://itatecnologiaeducacional.tech/login/\n'
        ))

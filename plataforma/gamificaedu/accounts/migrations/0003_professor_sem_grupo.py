"""
Migration 0003 — Adiciona opção 'sem_grupo' ao campo type_user do Professor.

Sem_grupo é usado para usuários que existem no sistema mas ainda não
receberam um perfil definido pelo ITA Admin.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # Depende da migration anterior de accounts
        ('accounts', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='professor',
            name='type_user',
            field=models.CharField(
                choices=[
                    ('admin',     'ITA Admin'),
                    ('school',    'Gestor Escolar'),
                    ('prof',      'Professor'),
                    ('sem_grupo', 'Sem Grupo'),
                ],
                default='prof',
                max_length=10,
                verbose_name='Tipo de usuário',
            ),
        ),
    ]

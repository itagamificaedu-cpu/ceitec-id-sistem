import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adiciona os modelos de segurança para verificação de identidade
    nas avaliações/quizzes do ItagGame:
      - AlunoPin: PIN de segurança com hash SHA-256
      - RegistroAcessoProva: log de acessos autenticados
      - TentativaSuspeita: log de tentativas com PIN incorreto
    """

    dependencies = [
        ('gamificaedu_quiz', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [

        # ── AlunoPin ──────────────────────────────────────────────
        migrations.CreateModel(
            name='AlunoPin',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID',
                )),
                ('pin_hash', models.CharField(
                    max_length=64,
                    verbose_name='PIN (hash SHA-256)',
                )),
                ('tentativas_falhas', models.IntegerField(
                    default=0,
                    verbose_name='Tentativas Falhas',
                )),
                ('bloqueado_ate', models.DateTimeField(
                    blank=True,
                    null=True,
                    verbose_name='Bloqueado Até',
                )),
                ('criado_em', models.DateTimeField(
                    auto_now_add=True,
                )),
                ('atualizado_em', models.DateTimeField(
                    auto_now=True,
                )),
                ('usuario', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='pin_seguranca',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Usuário',
                )),
            ],
            options={
                'verbose_name': 'PIN do Aluno',
                'verbose_name_plural': 'PINs dos Alunos',
            },
        ),

        # ── RegistroAcessoProva ───────────────────────────────────
        migrations.CreateModel(
            name='RegistroAcessoProva',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID',
                )),
                ('ip', models.GenericIPAddressField(
                    blank=True,
                    null=True,
                    verbose_name='Endereço IP',
                )),
                ('user_agent', models.TextField(
                    blank=True,
                    verbose_name='User Agent',
                )),
                ('metodo_autenticacao', models.CharField(
                    choices=[
                        ('sso', 'CEITEC ID (SSO)'),
                        ('pin', 'PIN de Segurança'),
                    ],
                    default='sso',
                    max_length=10,
                    verbose_name='Método de Autenticação',
                )),
                ('timestamp', models.DateTimeField(
                    auto_now_add=True,
                    verbose_name='Data/Hora do Acesso',
                )),
                ('aluno', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='acessos_quizzes',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Aluno',
                )),
                ('quiz', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='registros_acesso',
                    to='gamificaedu_quiz.quiz',
                    verbose_name='Quiz',
                )),
            ],
            options={
                'verbose_name': 'Registro de Acesso ao Quiz',
                'verbose_name_plural': 'Registros de Acesso aos Quizzes',
                'ordering': ['-timestamp'],
            },
        ),

        # ── TentativaSuspeita ─────────────────────────────────────
        migrations.CreateModel(
            name='TentativaSuspeita',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID',
                )),
                ('aluno_tentado', models.CharField(
                    help_text='Email ou nome do aluno que tentou o acesso',
                    max_length=200,
                    verbose_name='Identificação Tentada',
                )),
                ('ip', models.GenericIPAddressField(
                    blank=True,
                    null=True,
                    verbose_name='Endereço IP',
                )),
                ('timestamp', models.DateTimeField(
                    auto_now_add=True,
                    verbose_name='Data/Hora',
                )),
                ('motivo', models.CharField(
                    help_text='Ex: "PIN incorreto (3ª tentativa)", "Acesso sem autorização"',
                    max_length=255,
                    verbose_name='Motivo',
                )),
                ('quiz', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tentativas_suspeitas',
                    to='gamificaedu_quiz.quiz',
                    verbose_name='Quiz',
                )),
            ],
            options={
                'verbose_name': 'Tentativa Suspeita',
                'verbose_name_plural': 'Tentativas Suspeitas',
                'ordering': ['-timestamp'],
            },
        ),
    ]

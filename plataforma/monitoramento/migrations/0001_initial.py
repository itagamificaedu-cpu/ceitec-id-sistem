import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MonitoramentoFoco',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID',
                )),
                ('sessao_id', models.CharField(
                    max_length=100,
                    verbose_name='ID da Sessão',
                )),
                ('prova_id', models.CharField(
                    max_length=100,
                    verbose_name='ID da Prova',
                )),
                ('tipo_evento', models.CharField(
                    choices=[
                        ('blur',              'Saída de janela (blur)'),
                        ('visibility_hidden', 'Aba oculta (visibility hidden)'),
                        ('foco_retornado',    'Foco retornado'),
                    ],
                    max_length=30,
                    verbose_name='Tipo de Evento',
                )),
                ('timestamp', models.DateTimeField(
                    auto_now_add=True,
                    verbose_name='Timestamp do Servidor',
                )),
                ('timestamp_cliente', models.DateTimeField(
                    blank=True,
                    null=True,
                    verbose_name='Timestamp do Cliente',
                )),
                ('total_saidas', models.IntegerField(
                    default=0,
                    verbose_name='Total de Saídas na Sessão',
                )),
                ('aluno', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='registros_foco',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Aluno',
                )),
            ],
            options={
                'verbose_name': 'Registro de Foco',
                'verbose_name_plural': 'Registros de Foco',
                'ordering': ['timestamp'],
            },
        ),
    ]

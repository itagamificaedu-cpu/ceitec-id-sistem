# Migration gerada manualmente — cria tabela de presença do Curso de Férias

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inscricoes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PresencaCursoFerias',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dia', models.IntegerField(
                    choices=[(1, 'Dia 1'), (2, 'Dia 2'), (3, 'Dia 3'), (4, 'Dia 4'), (5, 'Dia 5')],
                    verbose_name='Dia do curso'
                )),
                ('presente', models.BooleanField(default=False, verbose_name='Presente')),
                ('hora_chegada', models.TimeField(blank=True, null=True, verbose_name='Hora de chegada')),
                ('observacao', models.CharField(blank=True, max_length=300, verbose_name='Observação')),
                ('registrado_em', models.DateTimeField(auto_now_add=True, verbose_name='Registrado em')),
                ('registrado_por', models.CharField(blank=True, max_length=100, verbose_name='Registrado por')),
                ('inscricao', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='presencas',
                    to='inscricoes.inscricao',
                    verbose_name='Inscrição'
                )),
            ],
            options={
                'verbose_name': 'Presença — Curso de Férias',
                'verbose_name_plural': 'Presenças — Curso de Férias',
                'ordering': ['dia', 'inscricao__nome_completo'],
                'unique_together': {('inscricao', 'dia')},
            },
        ),
    ]

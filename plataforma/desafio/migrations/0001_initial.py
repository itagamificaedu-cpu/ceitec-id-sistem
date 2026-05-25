# Migration gerada manualmente para o app desafio
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='CategoriaDesafio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome',  models.CharField(max_length=100, verbose_name='Nome')),
                ('icone', models.CharField(default='🚴', max_length=50, verbose_name='Ícone')),
                ('ativo', models.BooleanField(default=True, verbose_name='Ativo')),
            ],
            options={
                'verbose_name': 'Categoria do Desafio',
                'verbose_name_plural': 'Categorias do Desafio',
                'ordering': ['nome'],
            },
        ),
        migrations.CreateModel(
            name='AtividadeDesafio',
            fields=[
                ('id',        models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome',      models.CharField(max_length=200, verbose_name='Nome da atividade')),
                ('descricao', models.TextField(blank=True, verbose_name='Descrição')),
                ('categoria', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='atividades',
                    to='desafio.categoriadesafio',
                    verbose_name='Categoria',
                )),
            ],
            options={
                'verbose_name': 'Atividade do Desafio',
                'verbose_name_plural': 'Atividades do Desafio',
                'ordering': ['categoria__nome', 'nome'],
            },
        ),
        migrations.CreateModel(
            name='InscricaoDesafio',
            fields=[
                ('id',               models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero_inscricao', models.CharField(editable=False, max_length=20, unique=True, verbose_name='Número de inscrição')),
                ('tipo',             models.CharField(
                    choices=[('aluno', 'Aluno'), ('comunidade', 'Comunidade')],
                    max_length=20, verbose_name='Tipo de participante',
                )),
                ('nome_completo',   models.CharField(max_length=200, verbose_name='Nome completo')),
                ('email',           models.EmailField(verbose_name='E-mail')),
                ('telefone',        models.CharField(max_length=20, verbose_name='Telefone')),
                ('data_nascimento', models.DateField(verbose_name='Data de nascimento')),
                ('escola',    models.CharField(blank=True, max_length=200, verbose_name='Escola')),
                ('turma',     models.CharField(blank=True, max_length=50,  verbose_name='Turma')),
                ('matricula', models.CharField(blank=True, max_length=50,  verbose_name='Matrícula')),
                ('cpf',    models.CharField(blank=True, max_length=14,  verbose_name='CPF')),
                ('cidade', models.CharField(blank=True, max_length=100, verbose_name='Cidade')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='Inscrito em')),
                ('categoria', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='desafio.categoriadesafio',
                    verbose_name='Categoria',
                )),
                ('atividade', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='desafio.atividadedesafio',
                    verbose_name='Atividade',
                )),
            ],
            options={
                'verbose_name': 'Inscrição no Desafio',
                'verbose_name_plural': 'Inscrições no Desafio',
                'ordering': ['-criado_em'],
            },
        ),
    ]

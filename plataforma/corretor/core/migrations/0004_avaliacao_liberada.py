from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('corretor_core', '0003_alunoita_desempenhoaluno_observacaopedagogica'),
    ]

    operations = [
        migrations.AddField(
            model_name='avaliacao',
            name='liberada',
            field=models.BooleanField(default=False, help_text='Se a prova está liberada para acesso dos alunos no momento'),
        ),
    ]

from django.db import migrations


def deletar_alunos_corretor(apps, schema_editor):
    """Remove todos os alunos importados no corretor — fonte de dados agora e a tabela 'alunos' do sistema ITA."""
    Aluno = apps.get_model('corretor_core', 'Aluno')
    count = Aluno.objects.all().count()
    Aluno.objects.all().delete()
    print(f'  Removidos {count} alunos duplicados do corretor.')


class Migration(migrations.Migration):

    dependencies = [
        ('corretor_core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(deletar_alunos_corretor, migrations.RunPython.noop),
    ]

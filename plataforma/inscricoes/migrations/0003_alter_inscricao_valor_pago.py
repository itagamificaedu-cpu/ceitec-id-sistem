from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inscricoes', '0002_presencacursoferias'),
    ]

    operations = [
        migrations.AlterField(
            model_name='inscricao',
            name='valor_pago',
            field=models.DecimalField(decimal_places=2, default=99.9, max_digits=8),
        ),
    ]

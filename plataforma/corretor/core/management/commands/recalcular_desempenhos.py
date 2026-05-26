"""
Comando de gestao: recalcular_desempenhos
Recalcula e persiste o cache DesempenhoAluno a partir de todos os Resultados existentes.

Uso:
  python manage.py recalcular_desempenhos
  python manage.py recalcular_desempenhos --turma 9A
"""

from collections import defaultdict

from django.core.management.base import BaseCommand

from corretor.core.models import DesempenhoAluno, Resultado
from corretor.core.views_desempenho import _calcular_stats_aluno


class Command(BaseCommand):
    help = 'Recalcula o cache de desempenho de todos os alunos com base nos Resultados.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--turma',
            type=str,
            default='',
            help='Filtra o recalculo para uma turma especifica.',
        )

    def handle(self, *args, **options):
        filtro_turma = options.get('turma', '').strip()

        qs = (
            Resultado.objects
            .filter(nota__isnull=False)
            .select_related('avaliacao', 'avaliacao__professor', 'avaliacao__professor__tenant')
            .order_by('turma', 'aluno_nome', 'data_correcao')
        )

        if filtro_turma:
            qs = qs.filter(turma=filtro_turma)
            self.stdout.write(f'Filtrando turma: {filtro_turma}')

        # Agrupa por (aluno_nome, turma, escola_id)
        grupos = defaultdict(list)
        for r in qs:
            escola_id = getattr(r.avaliacao.professor, 'tenant_id', 0) or 0
            grupos[(r.aluno_nome, r.turma, escola_id)].append(r)

        total_ok  = 0
        total_err = 0

        for (aluno_nome, turma, escola_id), resultados in grupos.items():
            try:
                st = _calcular_stats_aluno(resultados)
                if not st:
                    continue

                DesempenhoAluno.objects.update_or_create(
                    aluno_nome=aluno_nome,
                    turma=turma,
                    escola_id=escola_id,
                    defaults={
                        'total_avaliacoes':     st['total_avaliacoes'],
                        'media_geral':          st['media'],
                        'maior_nota':           st['maior_nota'],
                        'menor_nota':           st['menor_nota'],
                        'taxa_aprovacao':       st['taxa_aprovacao'],
                        'evolucao':             st['evolucao'],
                        'classificacao':        st['classificacao'],
                        'notas_por_disciplina': st['notas_por_disciplina'],
                        'historico_notas':      st['historico'],
                    },
                )
                total_ok += 1
            except Exception as e:
                self.stderr.write(f'  Erro em {aluno_nome} / {turma}: {e}')
                total_err += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Concluido: {total_ok} desempenhos recalculados, {total_err} erros.'
            )
        )
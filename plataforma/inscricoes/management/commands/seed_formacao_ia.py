import json
from pathlib import Path

from django.core.management.base import BaseCommand

from inscricoes.models import FormacaoIA, ModuloFormacaoIA, SessaoFormacaoIA

CAMINHO_JSON = Path(__file__).resolve().parent.parent.parent / 'data' / 'curso_ia_educacao_120h.json'


class Command(BaseCommand):
    """
    Popula (ou atualiza) a edição da Formação em IA Aplicada à Educação a
    partir de inscricoes/data/curso_ia_educacao_120h.json — idempotente,
    rodar de novo não duplica nada.

    Uso: python manage.py seed_formacao_ia --edicao "2026.2 (Nov-Dez/2026)"
    """

    help = 'Popula FormacaoIA/ModuloFormacaoIA/SessaoFormacaoIA a partir do JSON do curso.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--edicao', default='2026.2 (Nov–Dez/2026)',
            help='Identificador da edição/turma (ex.: 2026.2 (Nov–Dez/2026))'
        )

    def handle(self, *args, **options):
        with open(CAMINHO_JSON, encoding='utf-8') as f:
            dados = json.load(f)

        curso_dados = dados['curso']
        edicao = options['edicao']

        curso, criado = FormacaoIA.objects.update_or_create(
            edicao=edicao,
            defaults={
                'nome': curso_dados['nome'],
                'carga_horaria_total': curso_dados['carga_horaria_total'],
                'carga_horaria_ead': curso_dados['etapa_ead_horas'],
                'carga_horaria_presencial': curso_dados['etapa_presencial_horas'],
                'certificacao_descricao': curso_dados['certificacao'],
            },
        )
        acao = 'criada' if criado else 'atualizada'
        self.stdout.write(self.style.SUCCESS(f'Edição {curso} {acao}.'))

        total_modulos, total_sessoes = 0, 0
        for modulo_dados in dados['modulos']:
            modulo, _ = ModuloFormacaoIA.objects.update_or_create(
                curso=curso,
                numero=modulo_dados['numero'],
                defaults={
                    'titulo': modulo_dados['titulo'],
                    'formato': modulo_dados['formato'],
                    'carga_horaria': modulo_dados['carga_horaria'],
                    'fundamentacao_texto': modulo_dados.get('fundamentacao_teorica', {}).get('texto', ''),
                    'fundamentacao_referencias': modulo_dados.get('fundamentacao_teorica', {}).get('referencias', []),
                },
            )
            total_modulos += 1

            for sessao_dados in modulo_dados.get('sessoes', []):
                SessaoFormacaoIA.objects.update_or_create(
                    modulo=modulo,
                    codigo=sessao_dados['codigo'],
                    defaults={
                        'titulo': sessao_dados['titulo'],
                        'carga_horaria': sessao_dados.get('carga_horaria', 4),
                        'objetivo': sessao_dados.get('objetivo', ''),
                        'conteudo': sessao_dados.get('conteudo', []),
                        'metodologia': sessao_dados.get('metodologia', ''),
                        'exemplo_pratico': sessao_dados.get('exemplo_pratico', ''),
                        'recursos': sessao_dados.get('recursos', []),
                        'avaliacao_produto': sessao_dados.get('avaliacao_produto', ''),
                        'referencias': sessao_dados.get('referencias', []),
                    },
                )
                total_sessoes += 1

        avaliacao = dados.get('avaliacao', {})
        if avaliacao:
            curso.peso_prova_presencial_pct = avaliacao.get('avaliacao_presencial_prova_pratica_pct', curso.peso_prova_presencial_pct)
            curso.peso_atividades_modulo_pct = avaliacao.get('atividades_quizzes_por_modulo_pct', curso.peso_atividades_modulo_pct)
            curso.peso_participacao_pct = avaliacao.get('participacao_forums_pct', curso.peso_participacao_pct)
            curso.peso_projeto_final_pct = avaliacao.get('projeto_aplicado_final_pct', curso.peso_projeto_final_pct)
            curso.frequencia_minima_pct = avaliacao.get('frequencia_minima_pct', curso.frequencia_minima_pct)
            curso.nota_minima = avaliacao.get('nota_final_minima', curso.nota_minima)
            curso.save()

        self.stdout.write(self.style.SUCCESS(
            f'{total_modulos} módulo(s) e {total_sessoes} sessão(ões) sincronizados para "{curso}".'
        ))
        self.stdout.write(self.style.WARNING(
            'Lembre-se de marcar esta edição como "ativa" no Django admin pra ela aparecer na landing page.'
        ))

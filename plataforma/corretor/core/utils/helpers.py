import re


def normalizar_turma(txt):
    """Normaliza string de turma para comparação fuzzy (remove espaços, acentos, 'ANO', 'º')."""
    s = str(txt).upper()
    s = s.replace('ANO', '').replace('º', '').replace(' ', '')
    return re.sub(r'[^A-Z0-9]', '', s)


def turmas_compativeis(turma_a, turma_b):
    """Retorna True se duas turmas normalizadas forem compatíveis."""
    na = normalizar_turma(turma_a)
    nb = normalizar_turma(turma_b)
    return na == nb or na in nb or nb in na

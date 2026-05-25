path = '/home/projetoitagame/game/views.py'

with open(path) as f:
    lines = f.readlines()

start = len(lines)
for i, line in enumerate(lines):
    if 'api_ranking_ceitec' in line or 'api_xp_ceitec' in line:
        start = i
        break

good = ''.join(lines[:start])

new_code = '''

def api_ranking_ceitec(request):
    from django.http import JsonResponse
    if request.GET.get('chave') != 'gamificaedu_secreto_2026':
        return JsonResponse({'erro': 'Nao autorizado'}, status=403)
    alunos = Aluno.objects.filter(user__is_staff=False).order_by('-xp').select_related('turma', 'user')
    data = []
    for a in alunos:
        xp = a.xp or 0
        nivel = 5 if xp >= 2000 else 4 if xp >= 1000 else 3 if xp >= 500 else 2 if xp >= 200 else 1
        data.append({'codigo': a.user.email, 'nome': a.user.get_full_name() or a.user.username, 'xp': xp, 'turma': a.turma.nome if a.turma else '', 'nivel': nivel})
    return JsonResponse({'ranking': data})


def api_xp_ceitec(request):
    import json
    from django.http import JsonResponse
    from django.contrib.auth.models import User as AuthUser
    if request.method != 'POST':
        return JsonResponse({'erro': 'Metodo invalido'}, status=405)
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({'erro': 'JSON invalido'}, status=400)
    if body.get('chave') != 'gamificaedu_secreto_2026':
        return JsonResponse({'erro': 'Nao autorizado'}, status=403)
    codigo = (body.get('codigo') or '').upper()
    xp_ganho = int(body.get('xp') or 0)
    if not codigo or xp_ganho <= 0:
        return JsonResponse({'erro': 'Parametros invalidos'}, status=400)
    user = AuthUser.objects.filter(email__iexact=codigo).first() or AuthUser.objects.filter(username__iexact=codigo).first()
    if not user:
        return JsonResponse({'erro': 'Aluno nao encontrado'}, status=404)
    try:
        aluno = Aluno.objects.get(user=user)
        aluno.xp = (aluno.xp or 0) + xp_ganho
        aluno.save()
        return JsonResponse({'ok': True, 'xp_total': aluno.xp, 'codigo': codigo})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)
'''

with open(path, 'w') as f:
    f.write(good + new_code)

print('OK! Linhas no arquivo:', len(open(path).readlines()))

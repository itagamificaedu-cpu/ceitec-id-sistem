@login_required
@assinantes_apenas  # <--- O NOSSO ADESIVO AQUI
def itagame_view(request):
    # ... suas 800 linhas continuam intactas aqui para baixo ...
    return render(request, 'core/itagame.html')

@login_required
@assinantes_apenas  # <--- O NOSSO ADESIVO AQUI
def corretor_view(request):
    # ... código do corretor ...
    return render(request, 'core/corretor.html')

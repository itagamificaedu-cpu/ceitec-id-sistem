from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse
from .models import Professor
from .forms import CadastroForm, LoginEmailForm
import uuid

def cadastro(request):
    if request.user.is_authenticated:
       return redirect(settings.LOGIN_REDIRECT_URL)
    if request.method == 'POST':
        form = CadastroForm(request.POST)
        if form.is_valid():
            professor = form.save(commit=False)
            professor.is_active = False
            professor.status_aprovacao = Professor.STATUS_PENDENTE
            professor.email_confirmado = False
            professor.token_confirmacao_email = uuid.uuid4()
            professor.token_expira_em = timezone.now() + timezone.timedelta(hours=24)
            professor.set_password(form.cleaned_data['password1'])
            professor.save()

            # Envia email de confirmação
            link = f"{request.scheme}://{request.get_host()}/accounts/confirmar-email/{professor.token_confirmacao_email}/"
            try:
                send_mail(
                    subject='itagamificaedu — Confirme seu email',
                    message=f'Olá {professor.first_name}!\n\nClique no link para confirmar seu email:\n{link}\n\nO link expira em 24 horas.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[professor.email],
                    fail_silently=True,
                )
            except:
                pass

            # Notifica admin
            try:
                send_mail(
                    subject='itagamificaedu — Novo cadastro aguardando aprovação',
                    message=f'Novo professor cadastrado:\n\nNome: {professor.get_full_name()}\nEmail: {professor.email}\nEscola: {professor.escola}\nDisciplina: {professor.disciplina}\n\nAcesse o painel admin para aprovar.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[settings.DEFAULT_FROM_EMAIL],
                    fail_silently=True,
                )
            except:
                pass

            return redirect('cadastro_sucesso')
    else:
        form = CadastroForm()
    return render(request, 'accounts/cadastro.html', {'form': form})


def cadastro_sucesso(request):
    return render(request, 'accounts/cadastro_sucesso.html')


def confirmar_email(request, token):
    try:
        professor = Professor.objects.get(token_confirmacao_email=token)
    except Professor.DoesNotExist:
        messages.error(request, 'Link inválido ou expirado.')
        return redirect('login')

    if not professor.token_email_valido:
        messages.error(request, 'Esse link expirou. Solicite um novo.')
        return redirect('login')

    professor.email_confirmado = True
    professor.save(update_fields=['email_confirmado'])
    return render(request, 'accounts/email_confirmado.html', {'professor': professor})


def login_view(request):
    if request.user.is_authenticated:
        return redirect(settings.LOGIN_REDIRECT_URL)

    next_url = request.GET.get('next', '')

    if request.method == 'POST':
        form = LoginEmailForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            senha = form.cleaned_data['password']

            try:
                usuario = Professor.objects.get(email=email)
            except Professor.DoesNotExist:
                messages.error(request, 'Email ou senha incorretos.')
                return render(request, 'accounts/login.html', {'form': form})

            # Verifica bloqueio
            if usuario.esta_bloqueado:
                minutos = int((usuario.bloqueado_ate - timezone.now()).seconds / 60) + 1
                messages.error(request, f'Conta bloqueada por tentativas excessivas. Tente novamente em {minutos} minuto(s).')
                return render(request, 'accounts/login.html', {'form': form})

            # Autentica
            user = authenticate(request, email=email, password=senha)
            if user is None:
                user = authenticate(request, email=email, password=senha)

            if user is None:
                usuario.registrar_tentativa_login(sucesso=False)
                tentativas = 5 - usuario.tentativas_login
                if tentativas > 0:
                    messages.error(request, f'Senha incorreta. {tentativas} tentativa(s) restante(s).')
                else:
                    messages.error(request, 'Conta bloqueada por 30 minutos devido a tentativas excessivas.')
                return render(request, 'accounts/login.html', {'form': form})

            # Superuser entra direto
            if user.is_superuser:
                login(request, user)
                return redirect("home")

            # Verifica email confirmado
            if not user.email_confirmado:
                messages.warning(request, 'Confirme seu email antes de entrar. Verifique sua caixa de entrada.')
                return render(request, 'accounts/login.html', {'form': form})

            # Verifica aprovação
            if user.status_aprovacao == Professor.STATUS_PENDENTE:
                messages.warning(request, 'Sua conta está aguardando aprovação do administrador. Você receberá um email em breve.')
                return render(request, 'accounts/login.html', {'form': form})

            if user.status_aprovacao == Professor.STATUS_REJEITADO:
                messages.error(request, f'Sua conta foi rejeitada. Motivo: {user.motivo_rejeicao or "Entre em contato com o suporte."}')
                return render(request, 'accounts/login.html', {'form': form})

            # Login bem sucedido
            user.registrar_tentativa_login(sucesso=True)
            ip = request.META.get('REMOTE_ADDR')
            user.ultimo_login_ip = ip
            user.save(update_fields=['ultimo_login_ip'])
            login(request, user)

            # Redireciona para ferramenta se vier de lá
            if next_url == 'itagame':
                return redirect('https://projetoitagame.pythonanywhere.com/painel/')
            elif next_url == 'corretor':
                return redirect('https://sitemadecriaecorrigirdeprovas.pythonanywhere.com/')

            return redirect(settings.LOGIN_REDIRECT_URL)
    else:
        form = LoginEmailForm()

    return render(request, 'accounts/login.html', {'form': form, 'next': next_url})


def logout_view(request):
    logout(request)
    return redirect(settings.LOGIN_REDIRECT_URL)


@login_required
def perfil(request):
    return render(request, 'accounts/perfil.html', {'professor': request.user})


def login_magico(request):
    """SSO: auto-login via chave compartilhada — usado pela plataforma ITA."""
    chave = request.GET.get('chave', '')
    email = request.GET.get('email', '')
    nome = request.GET.get('nome', email.split('@')[0] if email else '')
    next_url = request.GET.get('next', settings.LOGIN_REDIRECT_URL)

    if chave != 'gamificaedu_secreto_2026' or not email:
        return redirect(settings.LOGIN_URL)

    try:
        professor = Professor.objects.get(email=email)
    except Professor.DoesNotExist:
        from gamificaedu.core.models import Tenant
        tenant, _ = Tenant.objects.get_or_create(
            nome='ITA Tecnologia',
            defaults={'dominio': 'itatecnologiaeducacional.tech'}
        )
        partes = nome.strip().split(' ', 1)
        professor = Professor(
            email=email,
            username=email.split('@')[0],
            first_name=partes[0],
            last_name=partes[1] if len(partes) > 1 else '',
            tenant=tenant,
        )
        professor.set_unusable_password()
        professor.save()

    # Garante que o usuário SSO está ativo e aprovado
    professor.is_active = True
    professor.email_confirmado = True
    professor.status_aprovacao = Professor.STATUS_APROVADO
    professor.tentativas_login = 0
    professor.bloqueado_ate = None
    professor.save(update_fields=['is_active', 'email_confirmado', 'status_aprovacao', 'tentativas_login', 'bloqueado_ate'])

    login(request, professor, backend='django.contrib.auth.backends.ModelBackend')
    return redirect(next_url)


def reenviar_confirmacao(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        try:
            professor = Professor.objects.get(email=email)
            if not professor.email_confirmado:
                token = professor.gerar_token_email()
                link = f"{request.scheme}://{request.get_host()}/accounts/confirmar-email/{token}/"
                send_mail(
                    subject='itagamificaedu — Confirme seu email',
                    message=f'Olá {professor.first_name}!\n\nNovo link de confirmação:\n{link}\n\nExpira em 24 horas.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[professor.email],
                    fail_silently=True,
                )
                messages.success(request, 'Email de confirmação reenviado!')
            else:
                messages.info(request, 'Seu email já foi confirmado.')
        except Professor.DoesNotExist:
            messages.error(request, 'Email não encontrado.')
    return redirect('login')

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from gamificaedu.ferramentas.models import Ferramenta
import mercadopago
from django.conf import settings
import json
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from .models import Assinatura
import os
import csv
from datetime import datetime

def home(request):
    ferramentas = Ferramenta.objects.filter(ativo=True).order_by('-criado_em')[:6]
    return render(request, 'core/home.html', {'ferramentas': ferramentas})

def sobre(request):
    return render(request, 'core/sobre.html')

@login_required
def dashboard(request):
    ferramentas = Ferramenta.objects.filter(ativo=True).order_by('titulo')
    try:
        gamificacao = request.user.gamificacao
    except:
        from gamificaedu.gamification.models import GamificacaoPerfil
        gamificacao, _ = GamificacaoPerfil.objects.get_or_create(usuario=request.user, defaults={'tenant': getattr(request.user, 'tenant', None)})

    return render(request, 'core/dashboard.html', {
        'professor': request.user,
        'ferramentas': ferramentas,
        'gamificacao': gamificacao,
    })

# --- FUNÇÃO DE PAGAMENTO (MERCADO PAGO) ---
@login_required
def assinar_plano(request, tipo_plano):
    sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)

    if tipo_plano == 'educador':
        titulo = "Plano Professor - GamificaEdu"
        preco = 59.00
    elif tipo_plano == 'colaborador':
        titulo = "Plano Colaborador Premium - GamificaEdu"
        preco = 79.00
    else:
        return redirect('/')

    preference_data = {
        "items": [
            {
                "title": titulo,
                "quantity": 1,
                "unit_price": preco,
            }
        ],
        "payer": {
            "email": request.user.email
        },
        "back_urls": {
            "success": "https://itagamificaedu.pythonanywhere.com/dashboard/",
            "failure": "https://itagamificaedu.pythonanywhere.com/dashboard/",
            "pending": "https://itagamificaedu.pythonanywhere.com/dashboard/"
        },
        "auto_return": "approved",
        "external_reference": f"{request.user.id}_{tipo_plano}",
        "notification_url": "https://itagamificaedu.pythonanywhere.com/webhook/mercadopago/"
    }

    resposta = sdk.preference().create(preference_data)
    link_de_pagamento = resposta["response"]["init_point"]

    return redirect(link_de_pagamento)

# --- O OUVIDO DO SISTEMA (WEBHOOK BLINDADO) ---
@csrf_exempt
def mercadopago_webhook(request):
    log_file = '/home/itagamificaedu/portal_professores/webhook_log.txt'
    def registrar(texto):
        try:
            with open(log_file, 'a') as f:
                f.write(f"{datetime.now()} - {texto}\n")
        except:
            pass

    registrar("--- NOVO AVISO RECEBIDO DO MERCADO PAGO ---")
    payment_id = None

    if request.GET.get('topic') == 'payment':
        payment_id = request.GET.get('id')
    elif request.GET.get('type') == 'payment':
        payment_id = request.GET.get('data.id')

    if not payment_id and request.body:
        try:
            dados = json.loads(request.body)
            if dados.get('type') == 'payment' or dados.get('action') == 'payment.created':
                payment_id = dados.get('data', {}).get('id')
        except:
            pass

    registrar(f"ID do Pagamento encontrado: {payment_id}")

    if payment_id:
        try:
            sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
            payment_info = sdk.payment().get(payment_id)

            if payment_info["status"] == 200:
                pagamento = payment_info["response"]
                registrar(f"Status do pagamento no MP: {pagamento.get('status')}")

                if pagamento["status"] == "approved":
                    referencia = pagamento.get("external_reference")
                    registrar(f"Referencia do usuario: {referencia}")

                    if referencia:
                        user_id, tipo_plano = referencia.split('_')

                        User = get_user_model()
                        usuario = User.objects.get(id=user_id)

                        try:
                            assinatura = usuario.assinatura
                        except:
                            try:
                                assinatura = Assinatura(user=usuario)
                            except:
                                assinatura = Assinatura(usuario=usuario)

                        assinatura.plano = tipo_plano
                        assinatura.save()

                        # --- AUTOMAÇÃO ANTIGRAVITY: LIBERAÇÃO AUTOMÁTICA ---
                        # 1. Aprova o usuário e ativa na hora
                        usuario.status_aprovacao = 'aprovado'
                        usuario.is_active = True
                        
                        # 2. Gera o token de confirmação de e-mail
                        token = usuario.gerar_token_email()
                        usuario.save()

                        # 3. Dispara o E-mail de Boas-Vindas (Função será criada abaixo)
                        from .utils import enviar_email_boas_vindas
                        enviar_email_boas_vindas(usuario, token)

                        registrar(f"SUCESSO ABSOLUTO! Professor {usuario.email} liberado e e-mail enviado automaticamente.")

        # 👇 ESTA É A LINHA QUE FALTAVA PARA FECHAR O TRY DO MERCADO PAGO 👇
        except Exception as e:
            registrar(f"Erro ao processar webhook: {str(e)}")

@login_required
def corretor_view(request):
    return render(request, 'core/corretor.html')

# ============================================================
# ISCA DIGITAL: GERADOR DE PLANOS DE AULA COM IA (GEMINI)
# ============================================================
import google.generativeai as genai
from .models import LeadProfessor

def gerador_planos_aula(request):
    plano_gerado = None

    if request.method == 'POST':
        tema = request.POST.get('tema')
        disciplina = request.POST.get('disciplina')
        ano = request.POST.get('ano')
        nome = request.POST.get('nome', 'Professor(a)')
        whatsapp = request.POST.get('whatsapp')
        email_lead = request.POST.get('email')

        try:
            LeadProfessor.objects.create(nome=nome, whatsapp=whatsapp, disciplina=disciplina, tema=tema)
        except Exception as e:
            print("Erro ao salvar lead:", e)

        genai.configure(api_key=settings.GOOGLE_API_KEY)

        try:
            model = genai.GenerativeModel('gemini-flash-latest')
            prompt = f"Crie um plano de aula sobre '{tema}' para '{disciplina}' do '{ano}'. Estruture em HTML básico (<h3>, <p>, <ul>, <li>, <strong>). Não use a tag ```html. Inclua: 1. Objetivos 2. Metodologia gamificada 3. Exercício Prático."
            response = model.generate_content(prompt)
            plano_gerado = response.text
            
            # --- GAMIFICAÇÃO: Ganha XP por gerar aula ---
            from gamificaedu.gamification.models import adicionar_xp
            adicionar_xp(request.user, 50)

        except Exception as e:
            plano_gerado = f"<p style='color:red;'>Erro na IA: {str(e)}</p>"

    return render(request, 'gerador_aulas.html', {'plano_gerado': plano_gerado})

@login_required
def gerador_provas_view(request):
    resultado = None
    erro = None

    if request.method == 'POST':
        disciplina = request.POST.get('disciplina')
        serie = request.POST.get('serie')
        tema = request.POST.get('tema')
        dificuldade = request.POST.get('dificuldade')
        quantidade = request.POST.get('quantidade', '1')

        GOOGLE_API_KEY = settings.GOOGLE_API_KEY

        if not GOOGLE_API_KEY or len(GOOGLE_API_KEY) < 10:
            erro = "ERRO: Chave de API do Google não configurada."
        else:
            try:
                import google.generativeai as genai
                genai.configure(api_key=GOOGLE_API_KEY)
                model = genai.GenerativeModel('gemini-flash-latest')
                prompt = f"Atue como um professor especialista. Crie {quantidade} questões inéditas de múltipla escolha para a disciplina de {disciplina}, voltada para alunos do {serie}. Tema: {tema}. Dificuldade: {dificuldade}. Estrutura obrigatória para CADA questão: Texto-base, Enunciado, 5 Alternativas, Gabarito e Explicação. REGRA CRÍTICA: NÃO use formatação LaTeX, NÃO use códigos matemáticos e NÃO use formatação Markdown (sem asteriscos ** ou hashtags ###). Escreva em texto 100% puro e separe as questões claramente."
                response = model.generate_content(prompt)
                resultado = response.text

                # --- GAMIFICAÇÃO: Ganha XP por gerar prova ---
                from gamificaedu.gamification.models import adicionar_xp
                adicionar_xp(request.user, 100)
            except Exception as e:
                erro = f"Erro na IA: {str(e)}"

    return render(request, 'core/gerador_provas.html', {'resultado': resultado, 'erro': erro})
@login_required
def perfil(request):
    return render(request, 'core/perfil.html')

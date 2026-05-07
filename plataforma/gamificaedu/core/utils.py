from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

def enviar_email_boas_vindas(usuario, token):
    """
    Envia um e-mail de boas-vindas com o link de confirmação.
    """
    subject = 'Bem-vindo ao Itagamifica! Ative sua conta 🚀'
    link_confirmacao = f"https://itagamificaedu.pythonanywhere.com/accounts/confirmar-email/{token}/"
    
    context = {
        'usuario': usuario,
        'link_confirmacao': link_confirmacao,
    }
    
    html_message = render_to_string('emails/boas_vindas.html', context)
    plain_message = strip_tags(html_message)
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = usuario.email

    try:
        send_mail(
            subject, 
            plain_message, 
            from_email, 
            [to_email], 
            html_message=html_message
        )
        return True
    except Exception as e:
        print(f"Erro ao enviar e-mail: {e}")
        return False

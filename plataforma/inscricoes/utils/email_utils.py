from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings


def enviar_email_confirmacao(inscricao):
    assunto = '✅ Inscrição Confirmada — Alunos Maker Não Tiram Férias | CEITEC'
    base_url = getattr(settings, 'BASE_URL', 'https://itatecnologiaeducacional.tech')
    corpo_html = render_to_string(
        'inscricoes/emails/confirmacao.html',
        {'inscricao': inscricao, 'base_url': base_url}
    )
    corpo_texto = (
        f'Inscrição confirmada para {inscricao.nome_completo}.\n'
        f'Código: {inscricao.codigo_curto()}\n'
        f'Turno: {inscricao.get_turno_display()}\n'
        f'Em caso de dúvidas, entre em contato pelo WhatsApp.'
    )
    msg = EmailMultiAlternatives(
        subject=assunto,
        body=corpo_texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[inscricao.email],
    )
    msg.attach_alternative(corpo_html, 'text/html')
    msg.send(fail_silently=True)


def enviar_certificado_email(inscricao, pdf_bytes):
    assunto = f'🏆 Certificado Maker — {inscricao.nome_completo} | CEITEC'
    corpo_html = f'''
    <div style="font-family: Arial, sans-serif; background:#0A0E1A; color:#F0F4FF; padding:32px;">
      <h2 style="color:#F5A623;">Parabéns, {inscricao.nome_completo.split()[0]}!</h2>
      <p>Seu certificado de conclusão do curso <strong>Alunos Maker Não Tiram Férias</strong>
         está em anexo neste e-mail.</p>
      <p style="color:#8A95B5; font-size:13px;">
        Código de verificação: <strong style="color:#F5A623;">{inscricao.codigo_curto()}</strong>
      </p>
      <p style="color:#8A95B5; font-size:12px;">
        CEITEC — ITA Tecnologia Educacional · Itapipoca, CE
      </p>
    </div>
    '''
    corpo_texto = (
        f'Parabéns, {inscricao.nome_completo}! '
        f'Seu certificado está em anexo. '
        f'Código: {inscricao.codigo_curto()}'
    )
    nome_arquivo = (
        f"certificado_maker_{inscricao.nome_completo.replace(' ', '_').lower()}.pdf"
    )
    msg = EmailMultiAlternatives(
        subject=assunto,
        body=corpo_texto,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[inscricao.email],
    )
    msg.attach_alternative(corpo_html, 'text/html')
    msg.attach(nome_arquivo, pdf_bytes, 'application/pdf')
    msg.send(fail_silently=True)

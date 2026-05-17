from django import forms
from datetime import date
from .models import Inscricao


def _validar_cpf(cpf_str):
    cpf = ''.join(c for c in cpf_str if c.isdigit())
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    if resto in (10, 11):
        resto = 0
    if resto != int(cpf[9]):
        return False
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    if resto in (10, 11):
        resto = 0
    return resto == int(cpf[10])


class InscricaoForm(forms.ModelForm):
    aceita_termos = forms.BooleanField(
        required=True,
        label='Li e aceito os termos de participação',
        error_messages={'required': 'Você precisa aceitar os termos para continuar.'}
    )

    class Meta:
        model = Inscricao
        fields = [
            'nome_completo', 'data_nascimento', 'escola', 'serie',
            'nivel_experiencia', 'turno',
            'nome_responsavel', 'telefone', 'email', 'cpf_responsavel',
            'autoriza_imagem', 'aceita_termos',
        ]
        widgets = {
            'data_nascimento': forms.DateInput(
                attrs={'type': 'date', 'max': '', 'min': ''},
                format='%Y-%m-%d'
            ),
            'nivel_experiencia': forms.RadioSelect(),
            'turno': forms.RadioSelect(),
        }
        labels = {
            'nome_completo': 'Nome completo do aluno',
            'data_nascimento': 'Data de nascimento',
            'escola': 'Escola onde estuda',
            'serie': 'Série / Ano',
            'nivel_experiencia': 'Nível de experiência com tecnologia',
            'turno': 'Turno preferido',
            'nome_responsavel': 'Nome completo do responsável',
            'telefone': 'Telefone / WhatsApp',
            'email': 'E-mail do responsável',
            'cpf_responsavel': 'CPF do responsável',
            'autoriza_imagem': 'Autorizo o uso de imagem do aluno em redes sociais do CEITEC',
        }

    def clean_data_nascimento(self):
        nasc = self.cleaned_data.get('data_nascimento')
        if not nasc:
            raise forms.ValidationError('Data de nascimento obrigatória.')
        hoje = date.today()
        idade = hoje.year - nasc.year - (
            (hoje.month, hoje.day) < (nasc.month, nasc.day)
        )
        if idade < 11:
            raise forms.ValidationError('O aluno deve ter pelo menos 11 anos.')
        if idade > 17:
            raise forms.ValidationError('O aluno deve ter no máximo 17 anos.')
        return nasc

    def clean_cpf_responsavel(self):
        cpf = self.cleaned_data.get('cpf_responsavel', '')
        if not _validar_cpf(cpf):
            raise forms.ValidationError('CPF inválido. Verifique os dígitos.')
        digitos = ''.join(c for c in cpf if c.isdigit())
        return f'{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:11]}'

    def clean_telefone(self):
        tel = ''.join(c for c in self.cleaned_data.get('telefone', '') if c.isdigit())
        if len(tel) < 10 or len(tel) > 11:
            raise forms.ValidationError('Telefone inválido. Use (XX) XXXXX-XXXX.')
        return tel

    def clean_nome_completo(self):
        nome = self.cleaned_data.get('nome_completo', '').strip()
        if len(nome.split()) < 2:
            raise forms.ValidationError('Informe o nome completo (nome e sobrenome).')
        return nome.title()

    def clean_nome_responsavel(self):
        nome = self.cleaned_data.get('nome_responsavel', '').strip()
        if len(nome.split()) < 2:
            raise forms.ValidationError('Informe o nome completo do responsável.')
        return nome.title()

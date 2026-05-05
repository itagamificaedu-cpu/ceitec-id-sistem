from django import forms
from django.contrib.auth.password_validation import validate_password
from .models import Professor

ESTADOS = [
    ('', 'Selecione'), ('AC','AC'),('AL','AL'),('AP','AP'),('AM','AM'),
    ('BA','BA'),('CE','CE'),('DF','DF'),('ES','ES'),('GO','GO'),
    ('MA','MA'),('MT','MT'),('MS','MS'),('MG','MG'),('PA','PA'),
    ('PB','PB'),('PR','PR'),('PE','PE'),('PI','PI'),('RJ','RJ'),
    ('RN','RN'),('RS','RS'),('RO','RO'),('RR','RR'),('SC','SC'),
    ('SP','SP'),('SE','SE'),('TO','TO'),
]

class CadastroForm(forms.ModelForm):
    password1 = forms.CharField(
        label='Senha',
        widget=forms.PasswordInput(attrs={'placeholder': 'Mínimo 8 caracteres'}),
    )
    password2 = forms.CharField(
        label='Confirmar senha',
        widget=forms.PasswordInput(attrs={'placeholder': 'Repita a senha'}),
    )
    estado = forms.ChoiceField(choices=ESTADOS, required=False)
    termos = forms.BooleanField(
        required=True,
        label='Aceito os Termos de Uso e a Política de Privacidade'
    )

    class Meta:
        model = Professor
        fields = [
            'first_name', 'last_name', 'email', 'username',
            'escola', 'disciplina', 'cidade', 'estado',
            'telefone', 'bio'
        ]
        labels = {
            'first_name': 'Nome',
            'last_name': 'Sobrenome',
            'email': 'Email',
            'username': 'Nome de usuário',
            'escola': 'Escola / Instituição',
            'disciplina': 'Disciplina que leciona',
            'cidade': 'Cidade',
            'telefone': 'Telefone (opcional)',
            'bio': 'Sobre você (opcional)',
        }
        widgets = {
            'bio': forms.Textarea(attrs={'rows': 3}),
        }

    def clean_email(self):
        email = self.cleaned_data['email'].lower()
        if Professor.objects.filter(email=email).exists():
            raise forms.ValidationError('Já existe uma conta com este email.')
        return email

    def clean_username(self):
        username = self.cleaned_data['username']
        if Professor.objects.filter(username=username).exists():
            raise forms.ValidationError('Este nome de usuário já está em uso.')
        return username

    def clean_password1(self):
        password = self.cleaned_data.get('password1')
        if len(password) < 8:
            raise forms.ValidationError('A senha deve ter pelo menos 8 caracteres.')
        return password

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get('password1')
        p2 = cleaned.get('password2')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError({'password2': 'As senhas não coincidem.'})
        return cleaned

    def save(self, commit=True):
        professor = super().save(commit=False)
        professor.email = self.cleaned_data['email'].lower()
        if commit:
            professor.save()
        return professor


class LoginEmailForm(forms.Form):
    email = forms.EmailField(
        label='Email',
        widget=forms.EmailInput(attrs={'placeholder': 'seu@email.com', 'autofocus': True})
    )
    password = forms.CharField(
        label='Senha',
        widget=forms.PasswordInput(attrs={'placeholder': 'Sua senha'})
    )

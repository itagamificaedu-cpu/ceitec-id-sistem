from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import Avaliacao, Resultado


class LoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Usuário'
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Senha'
        })
    )


class AvaliacaoForm(forms.ModelForm):
    gabarito_json = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 5,
            'placeholder': '{"1": "A", "2": "B", "3": "C"}'
        }),
        help_text="Cole o gabarito em formato JSON"
    )
    
    class Meta:
        model = Avaliacao
        fields = [
            'titulo', 'instituicao', 'disciplina', 'serie', 'turma', 
            'data_aplicacao', 'numero_questoes', 'alternativas_por_questao', 
            'status', 'is_manual', 'is_online', 'arquivo_prova'
        ]
        widgets = {
            'titulo': forms.TextInput(attrs={'class': 'form-control'}),
            'instituicao': forms.TextInput(attrs={'class': 'form-control'}),
            'disciplina': forms.TextInput(attrs={'class': 'form-control'}),
            'serie': forms.TextInput(attrs={'class': 'form-control'}),
            'turma': forms.TextInput(attrs={'class': 'form-control'}),
            'data_aplicacao': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'numero_questoes': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 100}),
            'alternativas_por_questao': forms.NumberInput(attrs={'class': 'form-control', 'min': 2, 'max': 10}),
            'status': forms.Select(attrs={'class': 'form-control'}),
            'is_manual': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'is_online': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'arquivo_prova': forms.FileInput(attrs={'class': 'form-control'}),
        }
    
    def clean_gabarito_json(self):
        import json
        gabarito_str = self.cleaned_data.get('gabarito_json', '')
        if gabarito_str:
            try:
                return json.loads(gabarito_str)
            except json.JSONDecodeError:
                raise forms.ValidationError("JSON inválido. Use formato: {'1': 'A', '2': 'B'}")
        return {}
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and self.instance.gabarito:
            import json
            self.initial['gabarito_json'] = json.dumps(self.instance.gabarito)
    
    def save(self, commit=True):
        instance = super().save(commit=False)
        gabarito = self.cleaned_data.get('gabarito_json')
        if gabarito:
            instance.gabarito = gabarito
        else:
            instance.gabarito = {}
        if commit:
            instance.save()
        return instance


class ResultadoForm(forms.ModelForm):
    class Meta:
        model = Resultado
        fields = ['aluno_nome', 'turma', 'respostas', 'imagem_original', 'observacoes']
        widgets = {
            'aluno_nome': forms.TextInput(attrs={'class': 'form-control'}),
            'turma': forms.TextInput(attrs={'class': 'form-control'}),
            'respostas': forms.HiddenInput(),
            'imagem_original': forms.FileInput(attrs={'class': 'form-control', 'accept': 'image/*'}),
            'observacoes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }


class CorrecaoForm(forms.Form):
    imagem = forms.ImageField(
        widget=forms.FileInput(attrs={
            'class': 'form-control',
            'accept': 'image/*',
            'capture': 'environment'
        }),
        help_text="Envie a foto do gabarito preenchido"
    )
    avaliacao = forms.ModelChoiceField(
        queryset=Avaliacao.objects.filter(status='publicada'),
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    aluno_nome = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nome do aluno'})
    )
    turma = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Turma'})
    )

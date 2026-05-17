from django import template

register = template.Library()


@register.filter
def split(value, arg):
    """Divide uma string pelo separador informado. Uso: "a,b,c"|split:"," """
    return value.split(arg)

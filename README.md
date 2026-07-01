# Fila Mercado

Projeto-base de software para gerenciamento de filas por senha em supermercado, com foco nos setores de peixaria e açougue.

## O que ja vem pronto

- Totem para emissao de senhas por setor.
- Senha de prioridade com prefixo `PR`.
- Atendimento com filtro por setor, chamada da proxima senha, rechamada, finalizacao e pulo.
- Painel de chamada para TV ou monitor.
- Relatorio simples do dia.
- Configuracao de nome, prefixo e descricao dos setores.
- Persistencia local no navegador usando `localStorage`.
- Impressao simples da ultima senha emitida.

## Como usar

Abra o arquivo `index.html` no navegador.

Fluxo sugerido:

1. Na aba `Totem`, o cliente escolhe `Peixaria`, `Açougue` ou `Prioridade`.
2. Na aba `Atendimento`, o colaborador seleciona o setor e chama a proxima senha.
3. Na aba `Painel`, uma TV pode exibir a senha chamada.
4. No fim do expediente, use `Zerar dia` para reiniciar a numeracao.

## Estrutura

```text
.
├── docs/
│   └── REQUISITOS.md
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Proximos passos recomendados

- Separar o painel em uma rota/tela propria para usar em TV.
- Criar backend com banco de dados para varios computadores na mesma rede.
- Adicionar login para operador e administrador.
- Registrar tempo medio de espera e produtividade por atendente.
- Integrar com impressora termica.

# Requisitos do Sistema de Senhas

## Objetivo

Controlar filas de alto fluxo nos setores de peixaria e açougue, reduzindo confusao no balcao e dando visibilidade ao cliente sobre a proxima senha chamada.

## Perfis

- Cliente: emite senha no totem e acompanha o painel.
- Atendente: chama, rechama, finaliza ou pula senhas.
- Supervisor: acompanha indicadores e zera o dia.
- Administrador: ajusta nomes, prefixos e descricoes dos setores.

## Fluxo principal

1. Cliente escolhe o setor no totem.
2. Sistema emite senha sequencial com prefixo do setor.
3. Atendente seleciona setor ou todos os setores.
4. Atendente chama a proxima senha.
5. Painel exibe senha, setor e balcao.
6. Atendente finaliza ou pula a senha.
7. Supervisor acompanha resumo do dia.

## Regras iniciais

- Peixaria usa prefixo `P`.
- Açougue usa prefixo `A`.
- Prioridade usa prefixo `PR`.
- A numeracao reinicia quando o dia e zerado.
- Uma senha chamada pode ser rechamada.
- Ao chamar outra senha sem finalizar a atual, a atual volta para a fila.
- Com o filtro `Todos os setores`, senhas de prioridade sao chamadas antes das demais.

## Evolucao recomendada

- Backend com API REST para varios terminais na mesma rede.
- Banco de dados SQLite ou PostgreSQL.
- Tela de painel separada para TV.
- Autenticacao por perfil.
- Impressora termica por setor.
- Chamada por voz configuravel.
- Relatorio por horario de pico e tempo medio de espera.

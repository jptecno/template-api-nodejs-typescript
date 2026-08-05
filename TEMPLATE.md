# Manutenção do template

Este repositório é o template `api-nodejs-typescript` consumido pelo `@jptecno/cli`.

## Contrato com o CLI

O arquivo `template.json` é a fonte de verdade para:

- identificador estável do template;
- variáveis solicitadas ao desenvolvedor;
- arquivos de texto nos quais os marcadores são renderizados;
- comandos sugeridos após a criação.

Os marcadores seguem o formato `{{nomeDaVariavel}}`. Ao adicionar uma variável, declare-a em `template.json`, use-a somente nos arquivos listados em `render.include` e documente-a no `README.md`.

Não inclua scripts arbitrários para execução automática pelo CLI. Ações pós-criação devem permanecer declarativas, previsíveis e auditáveis.

## Diretrizes de evolução

- Mantenha o template genérico: não inclua nomes, URLs, credenciais ou regras de um produto específico.
- Preserve as fronteiras descritas em `AGENTS.md`.
- Prefira adicionar componentes somente quando um caso real justificar a inclusão no boilerplate.
- Toda mudança deve manter `npm run check` verde.
- Toda configuração obrigatória de runtime deve ter exemplo seguro em `.env.example`.

## Publicação

1. Atualize `README.md`, `template.json` e `.env.example` quando a experiência de criação mudar.
2. Execute `npm ci` e `npm run check`.
3. Execute `docker build -t template-api-nodejs-typescript .`.
4. Valide a criação por meio do `@jptecno/cli` em um diretório temporário e execute `npm run check` no projeto gerado.
5. Publique uma tag SemVer, por exemplo `v1.0.0`.
6. Atualize a referência dessa tag no catálogo mantido pelo CLI.

Use incremento de versão maior para alterações incompatíveis na estrutura ou configuração gerada; menor para novas capacidades compatíveis; correção para ajustes sem mudança de contrato.

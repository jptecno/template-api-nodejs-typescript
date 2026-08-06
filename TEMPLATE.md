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

## Versionamento e publicação

A versão do template é a tag Git referenciada pelo `template-registry`. Não altere o campo `version` de `package.json` para versionar o template: ele pertence aos projetos gerados.

- Patch: correções compatíveis no boilerplate.
- Minor: novas capacidades compatíveis entregues a novos projetos.
- Major: alterações incompatíveis na estrutura, configuração ou contrato gerado.

Para publicar uma versão do template:

1. Atualize `README.md`, `template.json` e `.env.example` quando a experiência de criação mudar.
2. Execute `npm ci`, `npm run check` e `docker build -t template-api-nodejs-typescript .`.
3. Valide a criação por meio do `@jptecno/cli` em um diretório temporário e execute `npm run check` no projeto gerado.
4. Promova a mudança validada de `development` para `main` por pull request.
5. Crie uma tag SemVer imutável a partir de `main`, por exemplo `v0.2.0`, e envie-a ao remoto.
6. Atualize o `template-registry` em pull request separado para apontar `version` e `ref` para a mesma tag.

Mudanças exclusivamente documentais não exigem tag ou atualização do registry.

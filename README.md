# {{projectName}}

{{description}}

API HTTP baseada em Node.js 24, TypeScript, Fastify, PostgreSQL e Kysely. A estrutura segue DDD, Clean Architecture e Ports & Adapters.

## Pré-requisitos

- Node.js 24
- npm
- PostgreSQL acessível pela aplicação
- Docker (opcional, para executar a imagem)

## Início rápido

```sh
cp .env.example .env
npm install
npm run dev
```

A API fica disponível em `http://localhost:3000`. Verifique a disponibilidade com:

```sh
curl http://localhost:3000/health
```

Resposta esperada:

```json
{ "status": "ok" }
```

## Configuração

| Variável       | Obrigatória | Padrão | Descrição                                                          |
| -------------- | ----------- | ------ | ------------------------------------------------------------------ |
| `DATABASE_URL` | Sim         | —      | URL de conexão PostgreSQL usada pelos adaptadores de persistência. |
| `PORT`         | Não         | `3000` | Porta HTTP, entre `1` e `65535`.                                   |

Nunca versione o arquivo `.env` ou credenciais reais. Use `.env.example` somente como ponto de partida local.

## Comandos

| Comando                | Finalidade                                             |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Inicia a API com recarga automática.                   |
| `npm run build`        | Compila TypeScript em `dist/`.                         |
| `npm start`            | Executa a aplicação compilada.                         |
| `npm test`             | Executa os testes Vitest.                              |
| `npm run format:check` | Verifica a formatação com Biome.                       |
| `npm run lint`         | Executa o lint do Biome.                               |
| `npm run typecheck`    | Verifica os tipos de código e testes.                  |
| `npm run check`        | Valida contrato, formato, lint, tipos, testes e build. |

## Docker

```sh
docker build -t {{projectName}} .
docker run --rm -p 3000:3000 --env-file .env {{projectName}}
```

## Estrutura

```text
src/
├── domain/        # Entidades, value objects e regras de negócio
├── application/   # Casos de uso, DTOs e portas
├── adapters/      # HTTP, persistência e integrações externas
├── composition/   # Montagem das dependências
└── main.ts        # Entrada da aplicação

tests/             # Espelha as camadas testadas
```

Os diretórios `domain/`, `application/` e `contracts/http/` são criados quando o primeiro caso de uso exigir seus respectivos elementos. Não adicione dependências de Fastify, Kysely, PostgreSQL ou Node.js ao domínio.

## Desenvolvimento

1. Modele regras e invariantes em `src/domain/`.
2. Crie o caso de uso e as portas necessárias em `src/application/`.
3. Implemente as portas em `src/adapters/`.
4. Conecte implementações concretas somente em `src/composition/`.
5. Adicione testes observáveis em `tests/` e execute `npm run check` antes de enviar mudanças.

### Branches, worktrees e ambientes

O repositório possui duas branches permanentes:

| Branch        | Finalidade               | Ambiente |
| ------------- | ------------------------ | -------- |
| `development` | Integração e homologação | Testes   |
| `main`        | Código aprovado          | Produção |

Após o primeiro commit em `main`, crie a branch de integração uma única vez:

```sh
git switch -c development
git push -u origin development
```

Todo trabalho deve começar a partir de `development` em um worktree próprio:

```sh
git fetch origin
git switch development
git pull --ff-only origin development
git worktree add ../api-feat-nome -b feat/nome development
```

No worktree criado, instale as dependências e execute a validação completa:

```sh
npm ci
npm run check
```

Fluxo de promoção:

1. Crie uma branch curta (`feat/*`, `fix/*` ou equivalente) a partir de `development`.
2. Desenvolva, teste e envie a branch para o repositório remoto.
3. Abra um pull request para `development`.
4. Faça merge em `development` somente após revisão, CI verde e validação no ambiente de testes.
5. Após a homologação, abra um pull request de `development` para `main`.
6. Faça merge em `main` somente com revisão e CI verde; essa branch aciona o ambiente de produção.

Não faça push direto em `development` ou `main`. O ruleset ativo `Proteção de branches permanentes` (ID `20485225`) exige pull request com uma aprovação, resolução das conversas e o status check `Validate template` da GitHub Actions, além de proibir exclusão e force-push nas duas branches. Segredos e configurações de testes/produção devem ser configurados no provedor de deploy por ambiente, nunca em branches ou arquivos versionados.

### Modelo de pull request

Todo pull request deve usar [`.github/pull_request_template.md`](./.github/pull_request_template.md). O modelo exige:

- resumo e lista objetiva das alterações;
- comportamento, camadas afetadas e compatibilidade;
- impactos de configuração, migração e segurança;
- exemplos de requisição e resposta quando a interface HTTP mudar;
- comandos e evidências de validação.

Para pull requests de `development` para `main`, preencha também homologação, impacto de produção e plano de rollback. Não remova seções aplicáveis; registre `Sem impacto` ou `Não se aplica` quando necessário.

## Versionamento do template

A versão do template é a tag Git consumida pelo `template-registry`; ela não é o campo `version` de `package.json`, que pertence a cada projeto gerado.

| Alteração no template                                         | Próxima tag                            |
| ------------------------------------------------------------- | -------------------------------------- |
| Correção compatível no boilerplate                            | Patch, por exemplo `v0.1.0` → `v0.1.1` |
| Nova capacidade compatível entregue a novos projetos          | Minor, por exemplo `v0.1.0` → `v0.2.0` |
| Alteração incompatível de estrutura, configuração ou contrato | Major, por exemplo `v1.0.0` → `v2.0.0` |

Mudanças exclusivamente documentais, como o modelo de pull request, não exigem uma nova tag nem atualização do registry.

Para uma release que altere o template gerado:

1. Valide a mudança em `development` com `npm run check` e o Docker build quando aplicável.
2. Promova `development` para `main` por pull request.
3. Crie e envie a tag a partir de `main`:

   ```sh
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. Atualize `template-registry/registry.json` em pull request separado, com `version` e `ref` apontando para a mesma nova tag.
5. Valide que o `@jptecno/cli` cria e valida um projeto a partir da versão publicada.

Consulte `AGENTS.md` para as convenções completas do repositório.

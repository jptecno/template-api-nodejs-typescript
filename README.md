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

| Comando             | Finalidade                            |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Inicia a API com recarga automática.  |
| `npm run build`     | Compila TypeScript em `dist/`.        |
| `npm start`         | Executa a aplicação compilada.        |
| `npm test`          | Executa os testes Vitest.             |
| `npm run lint`      | Executa Biome (lint e formatação).    |
| `npm run typecheck` | Verifica os tipos de código e testes. |
| `npm run check`     | Executa lint, tipos, testes e build.  |

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

Não faça push direto em `development` ou `main`. Configure proteções de branch, revisões obrigatórias e checks obrigatórios no GitHub. Segredos e configurações de testes/produção devem ser configurados no provedor de deploy por ambiente, nunca em branches ou arquivos versionados.

Consulte `AGENTS.md` para as convenções completas do repositório.

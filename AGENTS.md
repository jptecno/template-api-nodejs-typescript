# Diretrizes do Repositório

## Stack

- Node.js 24, TypeScript e configuração base `@tsconfig/node24`.
- Fastify para a interface HTTP.
- PostgreSQL persistido via Kysely.
- BiomeJS como formatador e linter.
- Vitest para testes; Undici para clientes HTTP em testes de integração.
- `@testcontainers/postgresql` para testes de integração que dependam de banco de dados real.

Mantenha as versões e os scripts definidos em `package.json` como fonte de verdade. Arquivos gerados devem permanecer em `dist/` e a cobertura em `coverage/`; nenhum deles deve ser versionado.

## Arquitetura e Estrutura

A API segue DDD, Clean Architecture e Ports & Adapters, com dependências sempre apontando para dentro:

- `src/domain/` — entidades, value objects, regras e erros de negócio. Não depende de Fastify, PostgreSQL, Kysely, Node.js ou HTTP.
- `src/application/` — casos de uso, DTOs de entrada/saída e portas (interfaces) requeridas pela aplicação. Depende apenas do domínio.
- `src/adapters/` — implementações das portas: rotas e controladores Fastify, repositórios Kysely, clientes externos e traduções de infraestrutura.
- `src/contracts/http/` — contratos HTTP neutros de framework, quando forem necessários para desacoplar a borda da aplicação.
- `src/composition/` — composição de dependências e montagem da aplicação.
- `src/main.ts` — ponto de entrada de produção.
- `tests/` — espelha a camada testada.

Regras de fronteira:

- O domínio não conhece detalhes de infraestrutura.
- Casos de uso dependem de portas, nunca de implementações concretas.
- Adaptadores traduzem dados e erros entre o mundo externo e a aplicação; não concentram regras de negócio.
- A composição é o único local que instancia e conecta implementações concretas.
- Mantenha módulos pequenos, coesos e com nomes do domínio ubíquo.

## Simplicidade e Clean Code

Evite over-engineering. Implemente somente abstrações justificadas pelo caso de uso atual ou por uma variação iminente e comprovada.

- Prefira código explícito, funções pequenas e responsabilidades únicas.
- Não introduza padrões, camadas, genéricos, factories, eventos ou interfaces sem necessidade concreta.
- Prefira composição a herança e injeção por construtor somente onde houver uma dependência real a ser isolada.
- Valide entradas nas bordas, preserve invariantes no domínio e retorne erros claros.
- Elimine duplicação relevante, sem abstrair prematuramente códigos que ainda não são estáveis.

## Estilo e Convenções

- Use TypeScript estrito, indentação de dois espaços, aspas simples, ponto e vírgula e imports de tipo com `import type` quando aplicável.
- O BiomeJS é a fonte de verdade para formatação e lint.
- Classes, tipos, interfaces e enums utilizam `PascalCase` no código; funções, variáveis e propriedades utilizam `camelCase`.
- Nomes de arquivos e diretórios utilizam `kebab-case` para evitar inconsistências entre sistemas de arquivos sensíveis a maiúsculas (Linux) e insensíveis (Windows/macOS).
- Adote sufixos explícitos no nome do arquivo indicando seu papel na arquitetura:
  - Casos de uso e serviços: `create-user.use-case.ts`, `send-email.service.ts`.
  - Controladores e rotas: `user.controller.ts`, `user.routes.ts`.
  - Repositórios e portas: `user-kysely.repository.ts`, `user-repository.port.ts`.
  - DTOs e tipos: `create-user.dto.ts`, `user.types.ts`.
  - Exceção: classes puras de domínio ou entidades podem utilizar `PascalCase` quando esta for a convenção acordada, por exemplo `User.ts`; mantenha `kebab-case` para todo o restante.
- Evite arquivos genéricos como `utils.ts`, `helpers.ts` ou `common.ts`; crie arquivos específicos e focados em uma única responsabilidade, por exemplo `date-formatter.ts`.
- Evite `any`; modele dados externos desconhecidos como `unknown` e faça o refinamento necessário.

## Persistência e HTTP

- Acesso ao PostgreSQL acontece apenas por adaptadores que implementam portas definidas pela aplicação.
- Use Kysely com consultas tipadas; não exponha tipos, tabelas ou detalhes do banco para domínio e aplicação.
- Migrações devem ser versionadas e reversíveis quando aplicável.
- Rotas e controladores Fastify devem apenas validar/transformar a requisição, invocar um caso de uso e mapear a resposta ou erro para HTTP.
- Use Undici nos testes que exercerem a API HTTP como cliente externo.

## Testes e Validação

- Testes Vitest ficam em `tests/` e terminam em `.test.ts`.
- Teste comportamento observável, não detalhes de implementação.
- Cubra regras de negócio no domínio e resultados dos casos de uso na aplicação.
- Testes de adaptadores e composição devem verificar status HTTP, corpos de resposta e caminhos de erro documentados.
- Use `@testcontainers/postgresql` em integrações com repositórios PostgreSQL; os testes devem isolar estado e limpar seus dados.
- Todo bug corrigido deve receber um teste de regressão quando viável.
- Antes de enviar mudanças, execute os scripts de validação disponíveis no `package.json` — idealmente uma verificação que reúna lint, testes e build.

## Fluxo Git, Worktrees e Ambientes

O repositório mantém duas branches permanentes:

- `development` — integração e ambiente de testes/homologação.
- `main` — código aprovado para produção.

Após o primeiro commit em `main`, crie e publique a base de integração:

```sh
git switch -c development
git push -u origin development
```

Todo desenvolvimento deve ocorrer em uma branch curta criada a partir de `development`, em um worktree separado. Não desenvolva diretamente em `development` ou `main`.

```sh
git fetch origin
git switch development
git pull --ff-only origin development
git worktree add ../api-feat-nome -b feat/nome development
```

Fluxo obrigatório de promoção:

1. Desenvolva e valide a alteração no worktree da branch `feat/*`, `fix/*` ou equivalente.
2. Execute `npm run check` antes de abrir o pull request.
3. Abra pull request da branch de trabalho para `development`.
4. Após aprovação, CI verde e validação no ambiente de testes, faça merge em `development`.
5. Abra pull request de `development` para `main` somente após a homologação em `development`.
6. Faça merge em `main` somente com CI verde e aprovação; essa branch representa produção.

O ruleset ativo `Proteção de branches permanentes` (ID `20485225`) protege `main` e `development` no GitHub:

- exige pull request com uma aprovação e resolução de todas as conversas;
- proíbe push direto, exclusão de branch e force-push;
- não exige status checks até que uma execução real confirme o nome do check da CI;
- associe o ambiente de testes a `development` e o ambiente de produção a `main`;
- mantenha segredos e configurações de cada ambiente no provedor de deploy, nunca em branches ou arquivos versionados.

Para hotfixes urgentes feitos a partir de `main`, promova a correção de volta para `development` por pull request ou merge, evitando divergência entre as branches permanentes.

## Commits e Pull Requests

Use Conventional Commits em português brasileiro, com escopo quando ele tornar a alteração mais clara. Exemplos:

- `feat(api): adiciona cadastro de parceiro`
- `fix(http): trata método não permitido`
- `test(repository): cobre falha de conexão`
- `chore(tooling): configura biome`

Use `.github/pull_request_template.md` como modelo obrigatório para todos os pull requests. Pull requests para `development` devem explicar resumo, alteração de comportamento, camadas afetadas, impactos de configuração ou migração, segurança e comandos de validação executados. Para alterações HTTP, inclua exemplos de requisição e resposta. Pull requests de `development` para `main` devem preencher também a homologação realizada, impacto de produção e plano de rollback.

## Versionamento do Template

A versão do template é definida pela tag Git e pela entrada correspondente no `template-registry`; o campo `version` de `package.json` pertence ao projeto gerado e não deve ser usado para versionar o template.

Use tags SemVer imutáveis. Correções compatíveis incrementam patch, novas capacidades compatíveis incrementam minor e alterações incompatíveis da estrutura, configuração ou contrato incrementam major. Para uma release, valide a mudança em `development`, promova para `main`, crie a tag a partir de `main` e atualize o registry em pull request separado para apontar `version` e `ref` para a nova tag. Mudanças exclusivamente documentais não exigem nova tag nem atualização do registry.

## Segurança e Configuração

Não versione credenciais, tokens, dados de clientes ou arquivos `.env`. Leia segredos de variáveis de ambiente ou de um gerenciador aprovado, valide a configuração na inicialização e masque dados sensíveis nos logs.

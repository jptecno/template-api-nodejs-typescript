# Plano de hardening do template Node.js + TypeScript

## 1. Objetivo

Entregar, em pull requests pequenos e ordenados, o hardening do template `api-nodejs-typescript` e do projeto gerado por ele, preservando DDD, Clean Architecture e Ports & Adapters. O resultado deve ser reproduzível, determinístico, auditável e validado sem serviços de IA externos.

Este documento é o plano executável das decisões já aprovadas. Itens ainda não aprovados ou deliberadamente adiados ficam somente em [`BACKLOG.md`](../BACKLOG.md).

## 2. Restrições e invariantes

- Todo desenvolvimento ocorre em branch curta criada de `development`, em worktree separado, conforme `AGENTS.md`.
- O diff local já existente deve ser preservado e transportado para o worktree; ele não deve ser descartado, refeito às cegas nem aplicado diretamente em `development` ou `main`.
- O diff local aprovado contém: Actions pinadas por SHA, `npm audit` apenas de dependências de runtime, Dependabot e Docker executado como usuário não root.
- O `schemaVersion` do manifesto continua `1`; não haverá compatibilidade com `postCreate`, pois ainda não existem usuários do formato anterior.
- O schema canônico do manifesto pertence ao `template-registry`; o template mantém uma cópia vendorizada e rastreável desse schema.
- O template não deve aceitar comandos shell livres. `command` e cada item de `args` são literais, sem shell, encadeamento, substituição, redirecionamento ou placeholders.
- Todo script de `package.json` citado por um step do manifesto deve existir. `package-lock.json` é obrigatório.
- Desenvolvimento local usa `npm install`; CI e validações end-to-end usam `npm ci`.
- O harness de manutenção do produtor e o harness entregue ao projeto gerado são artefatos distintos. Arquivos exclusivos do produtor não podem vazar para o projeto gerado.
- A versão do template nunca vem de `package.json`; ela vem do manifesto/configuração do Release Please, do changelog e da tag Git.
- Tags de release são SemVer, imutáveis e anotadas.
- Nenhum PR deste plano deve introduzir logging de aplicação: o logging do Fastify continua desativado.

## 3. Estratégia de branches, transporte do diff e gates

### 3.1 Preparação obrigatória antes do primeiro PR

1. Inventariar o diff local atual, incluindo arquivos não rastreados, sem alterá-lo.
2. Criar um worktree a partir da ponta atualizada de `development`, em branch curta dedicada.
3. Transportar o diff integralmente para esse worktree.
4. Comparar origem e destino para provar que os quatro conjuntos aprovados foram preservados: SHA de Actions, audit de runtime, Dependabot e Docker non-root.
5. Executar os gates específicos do PR no worktree e somente então abrir PR para `development`.

Se o transporte produzir conflito, resolver preservando a intenção do diff e a versão mais recente de `development`; não descartar silenciosamente nenhum trecho. O PR deve registrar os conflitos e a resolução na seção de migração/segurança do template de PR.

### 3.2 Gate mínimo de todo PR do template

- `npm ci` para reproduzir o lockfile no CI/worktree limpo.
- `npm run check` quando o PR tocar o projeto gerado ou seus scripts.
- Validador do contrato do template quando ele já estiver disponível.
- Testes focados da área alterada antes do gate completo.
- Build e smoke Docker quando houver impacto em container, runtime HTTP ou CI de integração.
- Revisão de segurança para alterações em manifesto, renderização, arquivos gerados, comandos, hooks, workflows, Docker ou release.
- Preenchimento integral de `.github/pull_request_template.md`, incluindo migração, rollback e evidências.

Documentação isolada não exige nova tag. Qualquer PR que altere o conteúdo gerado exige release do template antes de atualização do registry.

## 4. Dependências cross-repo e ordem de ativação

Os três repositórios podem evoluir em paralelo, mas o corte de produção deve obedecer à ordem abaixo.

| Marco     | Repositório                      | Entrega necessária                                                                                                                                                           | Bloqueia                                          |
| --------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `R1`      | `template-registry`              | Schema canônico do manifesto `schemaVersion: 1`, já com `toolchain`, requisitos, steps estruturados e regras de segurança                                                    | Vendorização e validação do manifesto no template |
| `C1`      | `cli`                            | Tipos/parser para o novo formato, validação pelo schema, allowlist literal e execução topológica dos steps permitidos                                                        | Publicação de template sem `postCreate`           |
| `C2`      | `cli`                            | Suporte ao contrato que separa arquivos do produtor dos arquivos gerados, inclusive variável opcional `codeOwner`                                                            | Harness separado e E2E fiel do projeto gerado     |
| `T1..T12` | `template-api-nodejs-typescript` | Implementação deste plano                                                                                                                                                    | Release do template                               |
| `R2`      | `template-registry`              | PR automático para `development` adicionando a nova versão com `version`, `ref`, `commit` e status, descontinuando a ativa anterior e incrementando `revision`/`publishedAt` | Disponibilização da release no CLI                |

Regras de coordenação:

1. `R1` define a forma exata do JSON; o template e o CLI não mantêm schemas divergentes.
2. A cópia vendorizada no template deve registrar a origem e a revisão do schema canônico.
3. `C1` deve aceitar apenas os executáveis/argumentos necessários a este template. Para npm, a allowlist mínima cobre `npm install` e `npm run <script-aprovado>`; `npm ci` permanece exclusivo de CI/e2e e não substitui a instalação local.
4. O CLI deve rejeitar steps desconhecidos, ciclos em `dependsOn`, dependências inexistentes, argumentos não literais, placeholders em `toolchain`, scripts npm ausentes e comandos fora da allowlist.
5. O novo manifesto pode entrar em `development` do template antes da release do CLI somente se os testes cross-repo usarem a revisão compatível do CLI. O registry não pode apontar para a nova tag antes da publicação compatível do CLI.
6. Como não há usuários do manifesto antigo, a troca de `postCreate` por `toolchain` é atômica; não adicionar modo dual ou fallback legado.
7. `R2` é sempre um PR separado para `development`, criado por GitHub App e nunca mesclado automaticamente.

### 4.1 Arquivos prováveis nos repositórios dependentes

Estes caminhos não fazem parte dos PRs do template, mas devem constar nos respectivos planos/revisões cross-repo:

- `template-registry`: schema canônico em diretório próprio de schemas, testes do schema, `README.md` e workflow de validação.
- `cli/src/contracts/template-manifest.types.ts`.
- `cli/src/application/parse-template-manifest.ts`.
- `cli/src/application/create-project.ts`.
- `cli/src/adapters/process-command-executor.ts`.
- `cli/tests/application/parse-template-manifest.test.ts`.
- `cli/tests/application/create-project.test.ts`.
- `cli/tests/adapters/process-command-executor.test.ts`.

A implementação cross-repo deve carregar a skill de segurança do CLI para mudanças em manifesto, comandos, paths, archives ou renderização.

## 5. Sequência de PRs do template

Cada PR abaixo tem escopo coeso, critérios de aceite observáveis e rollback independente. A numeração define a ordem recomendada de merge em `development`.

---

## PR T1 — Preservar e consolidar o hardening local existente

**Objetivo:** transportar sem perdas o diff local aprovado para o worktree e consolidá-lo como a primeira base revisável.

**Escopo**

- Actions referenciadas por SHA completa, mantendo comentário com a versão humana.
- `npm audit --audit-level=high --omit=dev` no CI.
- Dependabot para npm e GitHub Actions.
- Build e runtime Docker como usuário não root.

**Arquivos prováveis**

- `.github/workflows/ci.yml`.
- `.github/dependabot.yml`.
- `Dockerfile`.
- Eventuais arquivos já presentes no diff local, sem ampliar o escopo.

**Critérios de aceite**

- [ ] O diff transportado contém todos os trechos aprovados e não contém perdas em relação à origem.
- [ ] Toda ocorrência de `uses:` no workflow está pinada por SHA completa.
- [ ] O audit considera somente dependências de runtime e falha a partir de severidade `high`.
- [ ] Dependabot cobre npm e GitHub Actions.
- [ ] Os stages de build e produção do Docker não executam a aplicação como root.
- [ ] `npm ci`, `npm run check` e o build Docker passam.

**Dependências cross-repo:** nenhuma.

**Testes e gates**

- `npm ci`.
- `npm run check`.
- `docker build -t template-api-nodejs-typescript:hardening-t1 .`.
- Inspeção do usuário configurado na imagem.

**Migração:** somente transporte do diff existente para branch/worktree válidos; sem mudança de contrato.

**Rollback:** reverter apenas este PR no worktree/branch. Não recuperar o estado apagando ou sobrescrevendo o diff local de origem até o merge e a validação estarem confirmados.

---

## PR T2 — Adotar o manifesto `toolchain` e o contrato estrutural

**Objetivo:** substituir `postCreate` pelo novo `toolchain`, validar o manifesto com Ajv e impedir drift entre manifesto, arquivos e package metadata.

**Escopo**

- Vendorizar o schema canônico entregue por `R1`.
- Adicionar Ajv ao harness de manutenção.
- Manter `schemaVersion: 1` e remover `postCreate` sem fallback.
- Declarar requisitos de Node.js e npm com `minimumVersion`.
- Declarar `toolchain.steps` como objeto com as chaves `install`, `formatCheck`, `lint`, `typecheck`, `test` e `build`, conforme o schema canônico.
- Em todo step, tornar obrigatórios `command`, `args`, `dependsOn` e `recommended`; `dependsOn` referencia as chaves do objeto.
- Usar somente `command`/`args` literais compatíveis com a allowlist do CLI.
- Adicionar o script de verificação de formatação referenciado pelo step `formatCheck`.
- Criar contrato estrutural que valide schema, `render.include`, placeholders, existência e regularidade dos arquivos, scripts npm referenciados e coerência de `package.json`/`package-lock.json`.

**Arquivos prováveis**

- `template.json`.
- `package.json`.
- `package-lock.json`.
- Schema vendorizado em `schemas/` ou diretório equivalente explicitamente identificado como cópia do `template-registry`.
- `scripts/validate-template-contract.mjs`.
- `scripts/validate-template-contract.test.mjs`.
- `TEMPLATE.md`.
- `README.md`.

**Critérios de aceite**

- [ ] `template.json` continua em `schemaVersion: 1` e não contém `postCreate`.
- [ ] Node e npm têm `minimumVersion` válido conforme o schema canônico.
- [ ] `toolchain.steps` é um objeto com os seis steps aprovados, e cada um contém `command`, `args`, `dependsOn` e `recommended`.
- [ ] Não há string de shell composta, redirecionamento, variável de ambiente interpolada ou placeholder dentro de `toolchain`.
- [ ] A ordem efetiva é determinística e respeita `dependsOn`; não há ciclos nem referências ausentes.
- [ ] O step `install` usa `npm install`; nenhum step local usa `npm ci`.
- [ ] Cada `npm run <script>` declarado possui script correspondente em `package.json`.
- [ ] `package-lock.json` existe, está sincronizado e o contrato falha quando o manifest muda sem o lock correspondente.
- [ ] Todo item de `render.include` existe, é arquivo regular dentro do repositório e contém somente placeholders declarados.
- [ ] Todo placeholder conhecido que precise ser renderizado está em arquivo declarado por `render.include`; placeholders desconhecidos ou residuais falham.
- [ ] Ajv valida o manifesto usando a cópia vendorizada, e um teste prova que adulterar essa cópia ou o manifesto quebra o gate.
- [ ] O contrato possui testes positivos e negativos para path traversal, symlink de escape, arquivo ausente, placeholder desconhecido, script ausente, lock ausente/desalinhado, comando proibido e ciclo.

**Dependências cross-repo:** `R1` é obrigatória; `C1` deve estar pronto antes da release/ativação no registry.

**Testes e gates**

- Testes unitários do contrato.
- Execução direta do validador estrutural.
- `npm ci`.
- `npm run check`.
- Teste de contrato do CLI contra o manifesto real em revisão compatível de `C1`.

**Migração:** troca atômica de `postCreate` por `toolchain`; não há conversor nem compatibilidade legada.

**Rollback:** antes da release, reverter o PR. Depois de tag publicada, nunca mover ou recriar a tag: restaurar o registry para a última tag compatível e publicar uma nova tag corretiva para qualquer avanço.

---

## PR T3 — Separar harness do produtor e harness gerado

**Objetivo:** estabelecer inventários distintos e impedir que controles exclusivos da manutenção sejam entregues ao consumidor.

**Escopo**

- Definir no contrato do template quais arquivos pertencem ao produtor, quais são gerados e quais são compartilhados.
- Criar `AGENTS.md` e instruções de Claude/Copilot apropriados para manutenção do template.
- Entregar ao projeto gerado seu próprio `AGENTS.md`, instruções Claude/Copilot, `CODEOWNERS` renderizado pela variável opcional `codeOwner` e template de PR.
- Garantir que a ausência de `codeOwner` produza saída válida e sem proprietário inventado.
- Criar gerador/harness local determinístico para materializar o projeto em diretório temporário, sem rede e sem IA externa.
- Assegurar que metadata e ferramentas exclusivas do produtor não permaneçam na saída.

**Arquivos prováveis**

- `template.json`.
- `AGENTS.md` e `CLAUDE.md` do produtor.
- `.github/copilot-instructions.md` ou instruções equivalentes do produtor.
- Área explícita de conteúdo gerado/harness, definida pelo contrato `C2`.
- Arquivos gerados correspondentes a `AGENTS.md`, `CLAUDE.md`, instruções Copilot, `.github/CODEOWNERS` e `.github/pull_request_template.md`.
- `scripts/generate-template-project.mjs`.
- Testes/snapshots estruturais do projeto materializado.

**Critérios de aceite**

- [ ] Existe uma lista inequívoca de arquivos exclusivos do produtor, compartilhados e gerados.
- [ ] O projeto materializado não contém `template.json`, `TEMPLATE.md`, skills do produtor, scripts de release do template nem outros arquivos marcados como manutenção.
- [ ] O produtor continua com instruções específicas de manutenção e release do template.
- [ ] O projeto gerado recebe instruções específicas de desenvolvimento de API.
- [ ] `codeOwner` é opcional, validado como dado e renderizado sem permitir quebra estrutural do arquivo; vazio não cria owner fictício.
- [ ] A geração local é determinística: duas execuções com as mesmas entradas produzem a mesma árvore e os mesmos bytes, desconsiderando apenas o diretório temporário.
- [ ] A geração não acessa rede, não lê secrets e não invoca serviço de IA.
- [ ] O contrato falha quando um arquivo do produtor vaza ou quando falta um arquivo obrigatório do projeto gerado.

**Dependências cross-repo:** `C2` e o schema de `R1` precisam definir o mecanismo de separação/saída; não criar uma extensão privada incompatível no template.

**Testes e gates**

- Validação estrutural do template.
- Geração dupla e comparação byte a byte.
- Testes com `codeOwner` preenchido e vazio.
- Teste negativo para tentativa de injetar nova linha/padrão por `codeOwner`.
- `npm run check` no projeto fonte.

**Migração:** a árvore gerada muda, mas somente para novos projetos. Não há migração automática de repositórios já criados.

**Rollback:** reverter este PR antes da release. Após release, voltar o registry à tag anterior enquanto uma tag corretiva é preparada; não reintroduzir arquivos do produtor no projeto gerado como atalho.

---

## PR T4 — Adicionar skills determinísticas de manutenção e do projeto gerado

**Objetivo:** fornecer procedimentos locais, versionados e sem IA externa obrigatória para revisão, segurança, validação e release.

**Escopo**

- Skills do produtor: `validate-template-pull-request`, `review-template-producer-security`, `validate-generated-template` e `release-template`.
- Skills do projeto gerado: `validate-pull-request`, `review-api-change` e `review-api-security`.
- Cada skill deve declarar gatilhos, entradas, passos, gates, falhas bloqueantes e evidências esperadas.
- Skills não podem depender de tokens, APIs de IA ou estado não versionado.

**Arquivos prováveis**

- `.agents/skills/validate-template-pull-request/SKILL.md`.
- `.agents/skills/review-template-producer-security/SKILL.md`.
- `.agents/skills/validate-generated-template/SKILL.md`.
- `.agents/skills/release-template/SKILL.md`.
- Área de conteúdo gerado com as três skills de API.
- Contrato/snapshot do harness gerado.

**Critérios de aceite**

- [ ] As quatro skills do produtor existem apenas no harness de manutenção.
- [ ] As três skills de API existem no projeto gerado e não são substituídas pelas skills do produtor.
- [ ] Cada procedimento referencia comandos reais e arquivos existentes.
- [ ] Nenhuma skill exige IA externa para aprovar ou bloquear um gate.
- [ ] A skill de segurança do produtor cobre manifesto, schema vendorizado, renderização, paths, symlinks, comandos, hooks, workflows, Docker e release.
- [ ] A skill de release impede uso de `package.json` como versão do template e exige tag anotada e imutável.
- [ ] O contrato do harness detecta skill ausente, renomeada ou entregue no lado errado.

**Dependências cross-repo:** depende de T3; sem nova dependência externa.

**Testes e gates**

- Validador estrutural de skills.
- Materialização do projeto e verificação do inventário.
- Execução dos comandos documentados que não publiquem nem alterem Git.

**Migração:** apenas novos projetos recebem as skills; equipes existentes podem adotá-las manualmente em PR próprio.

**Rollback:** reverter o PR sem alterar o mecanismo de separação criado em T3.

---

## PR T5 — Instalar Lefthook e hooks contextuais

**Objetivo:** automatizar validações locais proporcionais ao diff e bloquear push sem o gate completo.

**Escopo**

- Adicionar Lefthook como dependência de desenvolvimento.
- Instalação automática via script `prepare`, sem baixar scripts remotos.
- `pre-commit` contextual: validar somente tipos de arquivos/áreas tocadas quando isso for seguro e sempre executar os guardas de lockfile/harness aplicáveis.
- `pre-push`: executar `npm run check`.
- Manter configuração distinta entre produtor e projeto gerado quando os contextos divergirem.

**Arquivos prováveis**

- `package.json`.
- `package-lock.json`.
- `lefthook.yml` do produtor.
- Arquivos gerados equivalentes.
- Scripts focados de pre-commit, com nomes específicos.
- Testes dos scripts de classificação contextual.

**Critérios de aceite**

- [ ] `npm install` local instala os hooks via `prepare`.
- [ ] `npm ci` de CI funciona com scripts habilitados onde aprovado.
- [ ] O pre-commit não executa comandos montados com conteúdo controlado pelo nome do arquivo.
- [ ] Mudança em `package-lock.json` sem `package.json` falha; mudança em manifest de pacote sem lock correspondente também falha.
- [ ] Mudança em manifesto/harness aciona seus validadores específicos.
- [ ] Pre-push executa exatamente `npm run check` e propaga falha.
- [ ] Bypass local de hook não substitui os checks bloqueantes do CI.
- [ ] O projeto materializado instala e executa apenas os hooks destinados ao projeto gerado.

**Dependências cross-repo:** depende de T3 e T4.

**Testes e gates**

- Testes de unidade/tabela para classificação de arquivos alterados.
- Casos com espaços, hífens, Unicode e nomes iniciados por opção.
- `npm ci`.
- `npm run check`.
- Execução controlada dos hooks em fixture, sem alterar o Git do repositório real.

**Migração:** contribuidores passam a receber hooks no próximo `npm install`; documentar como reinstalar e diagnosticar hooks.

**Rollback:** remover configuração, dependência e `prepare` no mesmo revert. O CI continua sendo a fonte de verdade durante o rollback.

---

## PR T6 — Aplicar políticas de PR com Danger, Semgrep e reviewdog

**Objetivo:** transformar regras de tamanho, lockfile, segurança e alteração do harness em checks determinísticos e bloqueantes.

**Escopo**

- Danger no produtor e no projeto gerado.
- Acima de 30 arquivos ou 800 linhas relevantes, exigir motivo e estratégia no corpo do PR.
- Excluir lockfiles da contagem de linhas relevantes, sem excluí-los da regra de coerência manifest/lock.
- Falhar quando lockfile muda sem manifest correspondente ou vice-versa.
- Semgrep com regras locais e reviewdog para anotações no PR.
- Gate `harness-change-approved` para alterações em arquivos sensíveis do harness.
- Actions pinadas por SHA, permissões mínimas e `timeout-minutes` por job.

**Arquivos prováveis**

- `Dangerfile.ts` ou arquivo equivalente do produtor.
- Dangerfile do projeto gerado.
- `.semgrep/` com regras e fixtures.
- Workflows de Danger, Semgrep/reviewdog e `harness-change-approved`.
- `.github/pull_request_template.md` do produtor e sua versão gerada.
- `package.json` e `package-lock.json` se Danger for instalado via npm.
- Definição central dos caminhos sensíveis do harness.

**Critérios de aceite**

- [ ] PR com 31 arquivos relevantes sem motivo/estratégia falha; com justificativa preenchida passa essa regra.
- [ ] PR com 801 linhas relevantes sem motivo/estratégia falha; exatamente nos limites aprovados não falha.
- [ ] Lockfiles não entram na soma de linhas relevantes.
- [ ] Lockfile sem manifest correspondente falha, independentemente da contagem.
- [ ] Mudança em manifesto sem lock atualizado falha quando aplicável.
- [ ] Semgrep usa regras versionadas e reviewdog anota o diff sem depender de IA.
- [ ] Alteração em caminhos de harness exige `harness-change-approved`; mudança fora deles não exige.
- [ ] A concessão da aprovação não pode ser feita por código vindo do próprio PR nem por actor sem permissão definida.
- [ ] Workflows usam somente permissões necessárias, têm timeout e Actions por SHA.
- [ ] O projeto gerado contém sua própria política, sem referências ao release/registry do produtor.

**Dependências cross-repo:** depende de T3 a T5. Se o gate usar environment ou equipe do GitHub, a proteção deve ser configurada no provedor antes de torná-lo required.

**Testes e gates**

- Testes do Danger com fixtures de diff/corpo do PR nos limites e fora deles.
- Testes Semgrep positivos e negativos.
- Validação estática dos workflows.
- Materialização do projeto e execução local das políticas que suportem modo fixture.
- `npm ci` e `npm run check`.

**Migração:** configurar `harness-change-approved` como check obrigatório apenas depois de um PR piloto comprovar que mantenedores autorizados conseguem aprovar sem deadlock.

**Rollback:** remover temporariamente o check da proteção antes de reverter o workflow, evitando bloquear todos os PRs. Manter as regras locais enquanto o check é reparado.

---

## PR T7 — Endurecer configuração e respostas HTTP

**Objetivo:** estabelecer limites e respostas HTTP seguras sem introduzir logging.

**Escopo**

- Body limit configurável por ambiente, padrão de 1 MiB, mínimo de 1 KiB e máximo de 10 MiB.
- Request, connection e keep-alive timeouts configuráveis, validados na inicialização e documentados com defaults explícitos.
- Manter `logger: false` de forma explícita.
- Instalar `@fastify/helmet` com CSP desativada (`contentSecurityPolicy: false`).
- Padronizar erros como `{ "error": { "code": "...", "message": "..." } }`.
- Definir um catálogo pequeno de códigos para os erros realmente expostos pelo baseline: requisição inválida, payload excedido, rota não encontrada, método não permitido, indisponibilidade e erro interno.
- Não expor stack, SQL, conexão, variável de ambiente ou detalhe interno.

**Arquivos prováveis**

- `src/composition/read-environment.ts`.
- `src/composition/create-application.ts`.
- `src/adapters/http/fastify-app.factory.ts`.
- `src/contracts/http/http-error.types.ts` ou arquivos focados equivalentes.
- `.env.example`.
- `README.md`.
- `package.json`.
- `package-lock.json`.
- `tests/composition/read-environment.test.ts`.
- `tests/adapters/http/fastify-app.factory.test.ts`.

**Critérios de aceite**

- [ ] Body ausente usa exatamente 1 MiB.
- [ ] Valores de body abaixo de 1 KiB, acima de 10 MiB, fracionários, negativos ou não numéricos falham na inicialização.
- [ ] Os três timeouts têm defaults documentados, aceitam apenas inteiros positivos dentro dos limites definidos no mesmo contrato e são passados ao Fastify.
- [ ] `logger` permanece explicitamente desativado.
- [ ] Helmet está ativo e CSP está explicitamente desativada.
- [ ] Erros observáveis seguem exatamente o envelope simples aprovado.
- [ ] Códigos são constantes/tipos neutros de framework; domínio e aplicação não dependem de Fastify.
- [ ] Erro interno retorna mensagem pública estável e não vaza detalhes.
- [ ] README e `.env.example` descrevem unidades, defaults e limites.

**Dependências cross-repo:** nenhuma; o lockfile deve continuar compatível com o contrato de T2.

**Testes e gates**

- Testes de tabela para limites/defaults de ambiente.
- Testes HTTP via Undici para headers do Helmet, payload excedido, 404, método não permitido e erro interno sanitizado.
- `npm run check`.
- Build Docker.

**Migração:** novas variáveis são opcionais e usam defaults seguros; deployments atuais continuam iniciando sem alteração. Documentar impacto para clientes que hoje enviem bodies acima de 1 MiB.

**Rollback:** remover variáveis e wiring em conjunto. Se clientes forem afetados antes do revert, elevar temporariamente o limite por variável dentro do máximo de 10 MiB.

---

## PR T8 — Implementar liveness e readiness PostgreSQL por ports/adapters

**Objetivo:** manter `/health` como liveness e adicionar `/ready` com consulta real ao PostgreSQL em toda chamada.

**Escopo**

- `/health` não consulta dependências e indica somente processo HTTP vivo.
- Porta de aplicação para verificação de prontidão.
- Adaptador Kysely/PostgreSQL que executa uma consulta mínima em toda chamada.
- Caso de uso de readiness sem dependência de Fastify/Kysely.
- `/ready` retorna `200` quando a consulta passa e `503` quando falha ou excede o mesmo timeout de request HTTP configurado em T7.
- Respostas não contêm detalhes de conexão, SQL ou erro interno.
- Teste de integração com PostgreSQL real via Testcontainers.

**Arquivos prováveis**

- `src/application/ports/readiness-check.port.ts`.
- `src/application/check-readiness.use-case.ts`.
- `src/adapters/persistence/kysely/kysely-readiness-check.adapter.ts`.
- `src/adapters/http/readiness.controller.ts` ou rota focada equivalente.
- `src/adapters/http/fastify-app.factory.ts`.
- `src/composition/create-application.ts`.
- `src/adapters/persistence/kysely/kysely-database.factory.ts`.
- Testes espelhados em `tests/application/`, `tests/adapters/persistence/`, `tests/adapters/http/` e `tests/composition/`.
- `README.md`.

**Critérios de aceite**

- [ ] `/health` responde sem tocar o banco.
- [ ] Cada chamada a `/ready` provoca nova consulta ao PostgreSQL; resultado anterior não é cacheado.
- [ ] Banco disponível retorna `200` com corpo simples e estável.
- [ ] Banco indisponível, credencial inválida, consulta falha ou timeout retorna `503` com o envelope de erro de T7 e sem detalhes.
- [ ] O orçamento usado pela readiness é o mesmo request timeout HTTP configurado em T7.
- [ ] A aplicação depende da porta, o adaptador implementa a porta e somente a composição instancia/conecta o Kysely.
- [ ] Fechamento da aplicação continua destruindo o pool.
- [ ] Testcontainers isola o PostgreSQL e o teste limpa/encerra recursos mesmo em falha.

**Dependências cross-repo:** depende de T7.

**Testes e gates**

- Teste unitário do caso de uso com fake da porta.
- Teste do adaptador com `@testcontainers/postgresql`.
- Testes HTTP via Undici para `200`, `503`, ausência de detalhes e chamada por request.
- `npm run check`.
- Smoke Docker com PostgreSQL efêmero.

**Migração:** `/ready` é rota aditiva; orquestradores podem migrar readiness probe de `/health` para `/ready`, mantendo `/health` como liveness.

**Rollback:** apontar temporariamente a readiness probe do deploy de volta para `/health` antes de reverter. Reverter rota, porta, adaptador e composição no mesmo PR para não deixar dependências órfãs.

---

## PR T9 — Tornar a imagem Docker reproduzível e verificável

**Objetivo:** fixar a base, manter scripts habilitados apenas no build aprovado e minimizar o runtime.

**Escopo**

- Pinar `node:24-bookworm-slim` por digest verificado nos dois stages, com comentário da tag legível.
- Build stage: `npm ci` com scripts habilitados.
- Production stage: `npm ci --omit=dev --ignore-scripts`.
- Ambos os stages e o processo final executam como usuário não root.
- Dependabot passa a monitorar Docker.
- Smoke verifica `/health` e UID não zero.

**Arquivos prováveis**

- `Dockerfile`.
- `.dockerignore`.
- `.github/dependabot.yml`.
- Scripts de smoke focados, se necessários.
- `README.md`.

**Critérios de aceite**

- [ ] Os dois `FROM` usam a mesma tag Node 24 Bookworm Slim e digest previamente verificado em fonte oficial.
- [ ] A revisão registra a evidência que relaciona tag e digest; atualização futura de digest ocorre por PR revisável.
- [ ] O build executa `npm ci` sem `--ignore-scripts`.
- [ ] Produção executa exatamente a instalação sem devDependencies e com scripts desabilitados.
- [ ] Nenhum stage executa instalação, build ou processo final como root depois da preparação mínima necessária.
- [ ] A imagem final não inclui `tests/`, harness do produtor, `.git`, `.env`, coverage ou dependências de desenvolvimento.
- [ ] Smoke prova UID diferente de zero e `/health` em `200`.
- [ ] Dependabot contém ecossistema Docker para a raiz.

**Dependências cross-repo:** depende de T5 porque o comportamento de `prepare` precisa ser compatível com scripts habilitados no build e ignorados em produção.

**Testes e gates**

- Build Docker sem cache em execução de validação dedicada.
- Inspeção de UID/USER.
- Inspeção de dependências de produção.
- Smoke `/health`; `/ready` também pode ser exercitado com PostgreSQL efêmero, mas não substitui o smoke de liveness.
- `npm run check`.

**Migração:** rollout da nova imagem sem alteração de volume. Confirmar que diretórios graváveis necessários pertencem ao usuário não root.

**Rollback:** redeploy da imagem da tag anterior. Não alterar o digest de uma tag Git já publicada; correção exige novo PR e nova tag do template.

---

## PR T10 — Reestruturar CI em dois jobs bloqueantes end-to-end

**Objetivo:** separar falhas de contrato estrutural das falhas de execução do projeto gerado.

**Escopo**

- Job bloqueante `structural`: valida schema, inventários, `render.include`, placeholders, arquivos, package JSON/lock, harness e workflows sem executar comandos do projeto gerado.
- Job bloqueante `integration`: materializa projeto em diretório isolado, sem secrets e sem IA; executa `npm ci`, `npm run check`, build Docker e smoke.
- Actions pinadas por SHA, permissões mínimas e timeout em todos os jobs.
- Ambiente isolado, valores de fixture não sensíveis e PostgreSQL efêmero quando `/ready` for exercitado.
- Os nomes finais dos dois jobs devem permanecer estáveis para proteção de branch.

**Arquivos prováveis**

- `.github/workflows/ci.yml`.
- Scripts do contrato/generação criados em T2/T3.
- Scripts de smoke criados em T9.
- Fixtures determinísticas de geração.
- Documentação de checks obrigatórios.

**Critérios de aceite**

- [ ] Exatamente dois jobs principais e bloqueantes distinguem estrutural e integração.
- [ ] `structural` não instala nem executa scripts do projeto materializado; adulterações puramente estruturais falham nele.
- [ ] `integration` parte de diretório limpo/materializado e usa `npm ci`, nunca `npm install`.
- [ ] `integration` executa o `npm run check` do projeto gerado, não apenas o check do produtor.
- [ ] O Docker build usa a árvore gerada, e o smoke valida `/health` e UID não zero.
- [ ] O job não recebe secrets; credenciais efêmeras de PostgreSQL são valores de fixture locais ao job.
- [ ] Nenhuma etapa chama API de IA ou depende de resultado não determinístico.
- [ ] Todas as Actions estão pinadas por SHA completa, cada job tem `timeout-minutes` e a permissão padrão é `contents: read` ou menor quando possível.
- [ ] Falha em qualquer um dos jobs impede merge por proteção de branch.

**Dependências cross-repo:** depende de T2, T3, T7, T8 e T9; o teste de compatibilidade do CLI usa a revisão/release compatível de `C1/C2` em gate separado ou fixture pinada, sem baixar a ponta mutável de branch.

**Testes e gates**

- Executar localmente scripts de `structural` e `integration` quando possível.
- Fixtures negativas para provar atribuição correta de falhas aos jobs.
- Execução completa do workflow em PR piloto.
- Confirmar os dois checks como required em `development` e `main` somente após o piloto verde.

**Migração:** adicionar os novos checks, validar um PR piloto e depois substituir o check antigo nas regras de proteção. Evitar intervalo sem check obrigatório ou configuração que exija um nome inexistente.

**Rollback:** restaurar temporariamente o check anterior nas proteções antes de reverter o workflow; nunca deixar `development`/`main` sem gate bloqueante.

---

## PR T11 — Adicionar Trivy e SBOM CycloneDX

**Objetivo:** bloquear vulnerabilidades corrigíveis de alto impacto e produzir inventário de componentes em todo CI.

**Escopo**

- Trivy sobre a imagem gerada.
- Bloquear `HIGH`/`CRITICAL` somente quando houver correção disponível.
- Reportar vulnerabilidades sem correção sem bloquear o merge.
- Gerar SBOM CycloneDX em toda execução de CI.
- Fazer upload do SBOM somente em `main` e tags, com retenção de 30 dias.
- Actions e ferramentas pinadas por SHA/versão imutável, com permissões mínimas.

**Arquivos prováveis**

- `.github/workflows/ci.yml` ou workflow chamado pelo job de integração.
- Configuração Trivy, caso necessária.
- Scripts de geração/validação de SBOM.
- Documentação de triagem de vulnerabilidade.

**Critérios de aceite**

- [ ] Imagem com vulnerabilidade `HIGH` ou `CRITICAL` corrigível faz o gate falhar.
- [ ] Vulnerabilidade sem fix aparece no relatório, mas não altera o status para falha.
- [ ] Severidades abaixo de `HIGH` não bloqueiam este gate.
- [ ] Um SBOM válido no formato CycloneDX é gerado em PR, `development`, `main` e tag.
- [ ] Em PR e `development`, o arquivo não é enviado como artifact persistente.
- [ ] Em `main` e tags, o artifact é enviado com retenção de exatamente 30 dias.
- [ ] Upload não expõe secrets, URLs autenticadas ou conteúdo de `.env`.
- [ ] A varredura usa a mesma imagem aprovada no smoke, identificada por tag/digest local inequívoco.

**Dependências cross-repo:** depende de T10.

**Testes e gates**

- Validar o JSON/XML CycloneDX com ferramenta compatível.
- Fixture ou imagem controlada para provar a diferença entre vulnerabilidade corrigível e não corrigível.
- Execução do CI em PR, `main` e tag de teste controlada antes de habilitar release.

**Migração:** observar inicialmente o relatório em branch de trabalho, corrigir findings existentes com fix e só então marcar o gate como obrigatório.

**Rollback:** se a fonte de vulnerabilidades estiver indisponível, manter geração de relatório/SBOM e remover temporariamente apenas a obrigatoriedade do check nas proteções, com incidente registrado; não alterar o filtro para esconder findings.

---

## PR T12 — Configurar Release Please e atualização segura do registry

**Objetivo:** automatizar changelog/release sem usar a versão do projeto gerado e preparar, sem merge automático, o PR de atualização do registry.

**Escopo**

- Release Please operado conceitualmente como CLI, com configuração explícita para o template.
- Versão armazenada em `.release-please-manifest.json`, configuração de release e `CHANGELOG.md`; nunca em `package.json`.
- Fluxo `development` → `main`; release somente a partir de commit aprovado em `main`.
- Tag SemVer anotada e imutável.
- Após a criação da release, validar novamente contrato, projeto gerado, `npm ci`, `npm run check`, Docker, smoke, Trivy e SBOM.
- GitHub App prepara PR no `template-registry` com base em `development`, adicionando `version`, `ref`, `commit` e status, descontinuando a ativa anterior e incrementando `revision`/`publishedAt`; não faz merge.
- GitHub App com apenas `metadata: read`, `contents: write` e `pull requests: write`, credenciais restritas ao environment `release`.

**Arquivos prováveis**

- `.release-please-manifest.json`.
- `release-please-config.json`.
- `CHANGELOG.md`.
- Workflow de release em `.github/workflows/`.
- Script focado de validação/tag anotada.
- Script/integração para abrir PR no registry.
- `TEMPLATE.md` e `README.md`.

**Critérios de aceite**

- [ ] Alterar `.release-please-manifest.json`/config/changelog define a release do template; `package.json.version` não é lido nem modificado para essa finalidade.
- [ ] O fluxo respeita `development` como integração e `main` como produção.
- [ ] A tag criada é anotada, SemVer e aponta para o commit aprovado em `main`.
- [ ] Tag já existente nunca é movida, apagada ou recriada pelo workflow.
- [ ] Todos os gates finais rodam sobre a tag/commit de release antes da abertura do PR no registry.
- [ ] O App usa environment `release` e apenas as três permissões aprovadas.
- [ ] O PR no registry tem base `development`, altera somente a entrada esperada e mantém `version === ref === tag`.
- [ ] O PR contém evidências da validação da release e não é mesclado automaticamente.
- [ ] Falha ao abrir o PR no registry não invalida nem move a tag; produz erro acionável e permite retry idempotente sem PR duplicado.

**Dependências cross-repo:** `C1/C2` publicados, `R1` mesclado e mecanismo `R2` autorizado no `template-registry`. O GitHub App deve estar instalado nos dois repositórios com os secrets/configurações no environment `release`.

**Testes e gates**

- Dry-run da configuração do Release Please.
- Teste que falha se a automação tentar alterar `package.json.version`.
- Verificação local de tag anotada em repositório temporário, nunca no repositório real durante testes.
- Teste de payload/fixture do PR do registry e idempotência.
- Execução completa em release candidata controlada.
- Validação final equivalente aos jobs T10/T11.

**Migração:** configurar App, environment e proteção antes de habilitar o workflow. A primeira release automatizada deve ser acompanhada e só pode atualizar o registry após o CLI compatível estar publicado.

**Rollback:** desabilitar o workflow de release e voltar ao processo manual documentado. Se a tag já foi publicada, mantê-la imutável; corrigir com nova tag. Se o PR do registry estiver incorreto, fechá-lo sem merge e abrir outro corrigido.

## 6. Matriz de gates por capacidade

| Capacidade           | Gate primário                 | Evidência mínima                                                            |
| -------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| Manifesto/schema     | Contrato estrutural + Ajv     | Testes positivos/negativos e revisão da origem do schema vendorizado        |
| Allowlist/toolchain  | Testes cross-repo do CLI      | Rejeição de comando/args maliciosos e execução topológica dos steps válidos |
| Separação de harness | Materialização determinística | Inventário da árvore gerada e ausência de arquivos do produtor              |
| Hooks                | Testes em fixture             | Pre-commit contextual e pre-push bloqueando falhas                          |
| Políticas de PR      | Fixtures Danger/Semgrep       | Limites 30/800, lock/manifest e harness approval                            |
| HTTP                 | Vitest + Undici               | Limites, headers, timeouts e envelope de erro                               |
| Readiness            | Testcontainers + Undici       | Consulta real por chamada e respostas 200/503 sem vazamento                 |
| Docker               | Build + smoke                 | Base por digest, npm modes, UID não zero e `/health`                        |
| CI E2E               | Dois jobs required            | Estrutural e integração verdes em árvore limpa                              |
| Supply chain         | Trivy + CycloneDX             | Bloqueio somente de fixable HIGH/CRITICAL e SBOM válido                     |
| Release              | Dry-run + validação da tag    | Versão fora de package.json, tag anotada e PR não automático no registry    |

## 7. Migração e rollback do programa

### 7.1 Corte coordenado

1. Entregar `R1` no `template-registry`.
2. Entregar e publicar `C1/C2` no CLI, mantendo testes contra fixture do novo manifesto.
3. Mesclar T1 a T12 em `development` do template, sempre com os gates acumulados.
4. Homologar a geração local e via CLI compatível, incluindo CI, Docker, `/health`, `/ready`, hooks e políticas.
5. Promover `development` para `main` por PR.
6. Criar a release/tag anotada a partir de `main`.
7. Rodar os gates finais sobre a tag.
8. O GitHub App abre `R2` para `development` do registry.
9. Revisar/mesclar `R2`; homologar o CLI consumindo a tag publicada.
10. Promover o registry de `development` para `main` conforme o fluxo próprio.

### 7.2 Rollback após ativação

- Não alterar conteúdo de tag já publicada.
- Para interromper novas gerações, abrir PR de roll-forward no registry: incrementar `revision`/`publishedAt`, revogar ou descontinuar a versão problemática e reativar a última versão conhecida como boa.
- Corrigir o template em branch derivada de `development`, promover e publicar nova tag SemVer.
- Se a falha estiver no CLI, restaurar a versão compatível do CLI ou publicar correção antes de reativar a tag do template.
- Projetos já gerados não são mutados pelo rollback do registry; qualquer correção neles ocorre por PR explícito no próprio projeto.
- Não há migração de banco neste plano. A readiness somente consulta o PostgreSQL.

## 8. Definição de concluído

O hardening está concluído somente quando:

- [ ] T1 a T12 foram mesclados em `development` e homologados.
- [ ] `npm ci` e `npm run check` passam no produtor e no projeto materializado.
- [ ] Os dois jobs E2E são bloqueantes em `development` e `main`.
- [ ] Docker passa em build, Trivy, SBOM, UID e smoke.
- [ ] `/health` e `/ready` cumprem seus contratos e os testes com Testcontainers passam.
- [ ] Harness do produtor e harness gerado possuem inventários distintos e validados.
- [ ] O CLI publicado entende o novo `toolchain` e aplica a allowlist aprovada.
- [ ] A release usa configuração/changelog/tag, sem versionar o template por `package.json`.
- [ ] A tag é anotada e imutável.
- [ ] O GitHub App abre PR no registry `development` sem merge automático e com permissões mínimas.
- [ ] README, TEMPLATE e templates de PR refletem operação, migração, segurança e rollback.

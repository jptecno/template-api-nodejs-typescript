# Revisão automatizada — lote piloto

## Objetivo

Adicionar três revisores complementares para pull requests: Semgrep CE bloqueante para poucos achados locais de alta confiança, Danger JS para políticas objetivas e heurísticas, e PR-Agent estritamente advisory.

## Requisitos e critérios de aceitação

### R1 — análise estática

- **AC1.1:** regras locais testadas detectam `pull_request_target`, Actions sem SHA e violações aplicáveis das fronteiras de `domain` e `application`.
- **AC1.2:** Semgrep CE roda com métricas desativadas, publica achados no diff via reviewdog e mantém o resultado bloqueante.
- **AC1.3:** forks degradam com segurança, sem receber permissão de escrita ou secrets.

### R2 — políticas de pull request

- **AC2.1:** funções puras retornam falha para título inválido, resumo vazio, PR `main` fora de `development`, promoção incompleta e artefatos gerados.
- **AC2.2:** mudanças HTTP exigem o campo de impacto HTTP; mudanças de migração exigem o campo de impacto de migração.
- **AC2.3:** tamanho, mudança comportamental sem teste aparente e configuração sensível sem contexto são somente warnings.
- **AC2.4:** testes cobrem caminhos aceitos e rejeitados; Danger bloqueia somente falhas objetivas.

### R3 — revisão por IA

- **AC3.1:** instruções priorizam DDD/Clean Architecture, HTTP/Fastify, Kysely/PostgreSQL, configuração, secrets e testes, ignorando estilo e overengineering.
- **AC3.2:** PR-Agent roda somente em PR interno não draft, não executa código do PR e é advisory.

### R4 — segurança e operação

- **AC4.1:** workflows não usam `pull_request_target`, têm permissões mínimas, timeout e concurrency.
- **AC4.2:** Actions são fixadas por SHA completo com versão documentada.
- **AC4.3:** instalação limpa, testes, `npm run check`, Semgrep e actionlint disponível são executados e registrados sem inventar resultados.

## Fora de escopo

CodeQL, Dependabot, cobertura obrigatória, regras Semgrep heurísticas ou amplas e alteração funcional da API.

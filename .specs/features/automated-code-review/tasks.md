# Tarefas — revisão automatizada

## Plano

- [x] **T1 — especificar o lote:** registrar requisitos, tarefas e gates.
- [ ] **T2 — Semgrep/reviewdog:** criar poucas regras testadas e workflow bloqueante seguro.
- [ ] **T3 — Danger:** criar funções puras, testes e workflow bloqueante para políticas objetivas.
- [ ] **T4 — PR-Agent:** configurar revisão advisory segura e focada na API.
- [ ] **T5 — validação final:** executar todos os gates e registrar evidências e limitações.

## Matriz de testes e gates

| Requisito | Evidência | Gate |
| --- | --- | --- |
| AC1.1 | fixtures positivas e negativas para workflows e fronteiras | `semgrep --test` |
| AC1.2–AC1.3, AC4.1–AC4.2 | inspeção e lint dos workflows | Semgrep + actionlint disponível |
| AC2.1–AC2.4 | testes unitários das funções puras | Vitest específico + `npm run check` |
| AC3.1–AC3.2 | inspeção da configuração e workflow | actionlint disponível |
| AC4.3 | instalação e suíte reproduzíveis | `npm ci`, testes, `npm run check` |

## Comandos de gate

- **Rápido:** `npm test -- tests/scripts/pr-policies.test.ts`
- **Completo:** `npm run check`
- **Semgrep:** `SEMGREP_SEND_METRICS=off semgrep --test .semgrep/rules` e scan local.
- **Workflows:** `actionlint` quando disponível; caso contrário, registrar a limitação.

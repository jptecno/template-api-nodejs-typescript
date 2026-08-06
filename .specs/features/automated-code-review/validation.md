# Validação — revisão automatizada

## Veredito

**PASS com limitações operacionais registradas.** Intervalo validado: `2bf3226..4faff95` mais este relatório.

## Evidências por critério

| Critério | Evidência observada | Resultado |
| --- | --- | --- |
| AC1.1 | `semgrep --test .semgrep/rules`: 4/4 regras/fixtures passaram, incluindo workflows e fronteiras | PASS |
| AC1.2–AC1.3 | scan local: zero findings; workflow preserva status do Semgrep e só publica review em PR interno | PASS |
| AC2.1 | `tests/scripts/pr-policies.test.ts:43-101` cobre aceite, título, resumo, origem de main, promoção e artefatos | PASS |
| AC2.2 | `tests/scripts/pr-policies.test.ts:103-133` exige impacto HTTP e migração somente para paths aplicáveis | PASS |
| AC2.3 | `tests/scripts/pr-policies.test.ts:135-153` afirma `failures: []` e três warnings heurísticos | PASS |
| AC2.4 | teste específico: 9/9; suíte completa: 20/20 | PASS |
| AC3.1–AC3.2 | `.pr_agent.toml` contém focos solicitados; workflow ignora draft/fork, não faz checkout e usa `continue-on-error` | PASS |
| AC4.1–AC4.2 | busca: nenhum `pull_request_target` ou Action sem SHA; quatro workflows têm permissions, timeout e concurrency | PASS |
| AC4.3 | `npm ci`, teste específico, `npm run check` e Semgrep executados | PASS limitado |

## Sensor de discriminação

A condição de rejeição de título foi temporariamente substituída por `if (false)`. O teste `reprova título fora de Conventional Commits` falhou em `tests/scripts/pr-policies.test.ts:54`, matando a mutação. O arquivo foi restaurado de `HEAD` e os 9 testes específicos voltaram a passar.

## Limitações

- `actionlint` não estava instalado (`command not found`); não há resultado de actionlint. O parser do Semgrep processou os workflows e as invariantes de segurança foram inspecionadas por regras e buscas locais.
- `npm ci` reportou duas vulnerabilidades transitivas (uma moderada e uma alta) na árvore que inclui Danger 13.0.10; nenhuma correção automática foi aplicada para evitar upgrade incompatível fora do escopo.
- As regras de fronteira foram testadas por fixtures, mas não tiveram targets reais porque o template ainda não contém arquivos em `src/domain/` ou `src/application/`.
- PR-Agent depende do secret `OPENAI_KEY` configurado no repositório; sem ele, o job advisory falhará sem bloquear.

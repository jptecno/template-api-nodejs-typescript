# Backlog futuro do template

Este backlog contém somente capacidades futuras, ainda fora do hardening aprovado. Os itens não devem ser incorporados incidentalmente aos PRs de [`docs/hardening-plan.md`](./docs/hardening-plan.md); cada um exige decisão própria, critérios de aceite, análise de segurança e plano de migração/rollback.

A ordem abaixo não representa prioridade de implementação.

## 1. Logging estruturado com redaction

**Objetivo futuro:** habilitar logging estruturado somente quando houver contrato de campos, níveis, correlação e mascaramento seguro.

**Antes de iniciar**

- Definir dados permitidos e proibidos em logs.
- Definir redaction para credenciais, tokens, cookies, headers sensíveis, URLs autenticadas e dados pessoais.
- Definir comportamento por ambiente, retenção e custos.
- Cobrir com testes que provem ausência de vazamento.

**Fora do escopo atual:** o baseline aprovado mantém logging desativado.

## 2. Content Security Policy para HTML ou Swagger

**Objetivo futuro:** habilitar CSP quando o template passar a servir HTML, documentação Swagger ou outra interface que a justifique.

**Antes de iniciar**

- Inventariar scripts, estilos, imagens, frames e conexões realmente necessários.
- Preferir política restritiva sem `unsafe-inline`/`unsafe-eval`.
- Testar a interface em modo enforcement e documentar exceções.

**Critério de entrada:** existir uma superfície HTML/Swagger real. Até lá, Helmet permanece com CSP desativada.

## 3. CORS

**Objetivo futuro:** fornecer política CORS explícita para APIs consumidas por navegadores.

**Antes de iniciar**

- Definir origens por ambiente, métodos, headers, credenciais e cache de preflight.
- Rejeitar reflexão irrestrita de `Origin` quando houver credenciais.
- Modelar configuração e testes de allow/deny.

**Critério de entrada:** existir consumidor browser e política de origens conhecida.

## 4. Rate limiting

**Objetivo futuro:** limitar abuso e rajadas com semântica adequada ao ambiente de execução.

**Antes de iniciar**

- Definir chave de identificação, limites por rota, janela, resposta `429` e headers.
- Decidir armazenamento local ou distribuído e comportamento em falha.
- Avaliar interação com proxies, múltiplas réplicas e endpoints de health/readiness.

**Critério de entrada:** requisitos de tráfego e topologia de deploy conhecidos.

## 5. `trustProxy`

**Objetivo futuro:** permitir confiança explícita em proxies conhecidos sem aceitar cegamente headers forjáveis.

**Antes de iniciar**

- Definir quantidade/CIDRs de proxies por ambiente.
- Testar resolução de IP, protocolo e host com cadeia válida e adulterada.
- Documentar dependência com CORS, rate limiting, redirects e auditoria.

**Critério de entrada:** topologia real de ingress/load balancer documentada.

## 6. Observabilidade

**Objetivo futuro:** adicionar métricas, tracing e correlação operacional com padrões e backend definidos.

**Antes de iniciar**

- Definir sinais, nomes, cardinalidade, sampling, propagação e SLOs.
- Evitar dados sensíveis em atributos/spans.
- Avaliar OpenTelemetry e custos de exportação/armazenamento.
- Separar telemetria de negócio de liveness/readiness.

**Critério de entrada:** backend de observabilidade e requisitos operacionais aprovados.

## 7. Validação profunda de Node.js e npm

**Objetivo futuro:** ir além da presença de `minimumVersion` e validar compatibilidade real de runtime/toolchain.

**Antes de iniciar**

- Definir política para versões major/minor/patch, prereleases e versões máximas.
- Decidir como detectar Node/npm em múltiplas plataformas sem executar shell.
- Cobrir mensagens de erro, modo offline e matriz de compatibilidade.
- Coordenar contrato no `template-registry` e comportamento no CLI.

**Critério de entrada:** requisitos simples do manifesto mostrarem-se insuficientes em uso real.

## 8. Harness central compartilhado

**Objetivo futuro:** extrair partes estáveis do harness para manutenção central, reduzindo duplicação entre templates.

**Antes de iniciar**

- Identificar regras realmente comuns após mais de um template adotá-las.
- Definir versionamento, distribuição, pinagem, atualização e fallback offline.
- Preservar autonomia, determinismo e separação entre produtor e projeto gerado.
- Evitar dependência de branch mutável ou execução remota não auditada.

**Critério de entrada:** duplicação comprovada entre múltiplos templates ativos.

## 9. Múltiplas linhas ativas do template

**Objetivo futuro:** suportar manutenção simultânea de mais de uma linha major/minor do template.

**Antes de iniciar**

- Definir política de suporte, backports, EOL e correções de segurança.
- Modelar como registry e CLI selecionam linhas sem tags mutáveis.
- Adaptar release, changelog, testes e promoção entre `development`/`main`.
- Documentar rollback e compatibilidade por linha.

**Critério de entrada:** existir base instalada que exija suporte paralelo.

## 10. Geração por base cross-repo

**Objetivo futuro:** permitir geração baseada em uma base compartilhada entre repositórios, com composição explícita e rastreável.

**Antes de iniciar**

- Definir ownership do contrato no `template-registry` e execução segura no CLI.
- Definir pinagem imutável, precedência de arquivos, conflitos, renderização e provenance.
- Impedir traversal, symlinks de escape, sobrescrita inesperada e comandos herdados fora da allowlist.
- Criar testes end-to-end entre base, template derivado, CLI e registry.
- Planejar migração sem tornar releases existentes não reproduzíveis.

**Critério de entrada:** haver ao menos dois templates com uma base comum estável e benefício mensurável de composição.

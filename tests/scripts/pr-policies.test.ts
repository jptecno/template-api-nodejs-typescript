import { describe, expect, it } from 'vitest';

import {
  evaluatePullRequest,
  type PullRequestFacts,
} from '../../scripts/danger/pr-policies.js';

const completeBody = `## Resumo

Adiciona revisão automatizada aos pull requests.

## Interface HTTP

Sem impacto HTTP.

## Configuração, migração e segurança

Sem impacto de migração ou segurança.

## Homologação e produção

- Ambiente de homologação e resultado: validado em development
- Impacto de produção: sem impacto na execução da API
- Plano de rollback: reverter o merge
`;

function facts(overrides: Partial<PullRequestFacts> = {}): PullRequestFacts {
  return {
    title: 'ci(review): adiciona políticas de pull request',
    body: completeBody,
    authorLogin: 'octocat',
    baseBranch: 'development',
    headBranch: 'chore/automated-review',
    files: [
      'scripts/danger/pr-policies.ts',
      'tests/scripts/pr-policies.test.ts',
    ],
    additions: 100,
    deletions: 20,
    ...overrides,
  };
}

describe('evaluatePullRequest', () => {
  it('aceita uma pull request que atende às políticas objetivas', () => {
    expect(evaluatePullRequest(facts())).toEqual({
      failures: [],
      warnings: [],
    });
  });

  it('reprova título fora de Conventional Commits', () => {
    expect(
      evaluatePullRequest(facts({ title: 'Adiciona revisão.' })).failures,
    ).toContain('Use um título no formato Conventional Commits.');
  });

  it('permite Dependabot sem resumo em pull request para development', () => {
    expect(
      evaluatePullRequest(facts({ authorLogin: 'dependabot[bot]', body: null }))
        .failures,
    ).not.toContain('Preencha a seção Resumo com uma descrição objetiva.');
  });

  it('reprova resumo vazio em pull request humano', () => {
    expect(evaluatePullRequest(facts({ body: null })).failures).toContain(
      'Preencha a seção Resumo com uma descrição objetiva.',
    );
  });

  it('reprova pull request do Dependabot para main fora de development', () => {
    expect(
      evaluatePullRequest(
        facts({
          authorLogin: 'dependabot[bot]',
          body: null,
          baseBranch: 'main',
          headBranch: 'dependabot/npm/typescript-6.0.4',
        }),
      ).failures,
    ).toContain('Pull requests para main devem ter origem em development.');
  });

  it('reprova promoção sem homologação, impacto e rollback', () => {
    const body = `## Resumo

Promove a versão homologada.

## Homologação e produção

- Ambiente de homologação e resultado:
- Impacto de produção:
- Plano de rollback:`;
    expect(
      evaluatePullRequest(
        facts({ body, baseBranch: 'main', headBranch: 'development' }),
      ).failures,
    ).toEqual([
      'Preencha o campo de promoção: Ambiente de homologação e resultado.',
      'Preencha o campo de promoção: Impacto de produção.',
      'Preencha o campo de promoção: Plano de rollback.',
    ]);
  });

  it('reprova artefatos em dist e coverage', () => {
    expect(
      evaluatePullRequest(
        facts({ files: ['dist/main.js', 'coverage/index.html'] }),
      ).failures,
    ).toContain(
      'Não versione artefatos gerados: dist/main.js, coverage/index.html.',
    );
  });

  it('exige impacto HTTP somente para arquivos HTTP', () => {
    const body = `## Resumo

Altera uma rota.`;
    expect(
      evaluatePullRequest(
        facts({ body, files: ['src/adapters/http/user.routes.ts'] }),
      ).failures,
    ).toContain('Descreva o impacto HTTP na seção Interface HTTP.');
    expect(
      evaluatePullRequest(facts({ files: ['src/domain/user.ts'] })).failures,
    ).not.toContain('Descreva o impacto HTTP na seção Interface HTTP.');
  });

  it('exige impacto de migração somente para migrations', () => {
    const body = `## Resumo

Adiciona tabela de usuários.`;
    expect(
      evaluatePullRequest(
        facts({
          body,
          files: ['src/adapters/persistence/migrations/001-user.ts'],
        }),
      ).failures,
    ).toContain(
      'Descreva o impacto de migração em Configuração, migração e segurança.',
    );
    expect(
      evaluatePullRequest(facts({ files: ['src/domain/user.ts'] })).failures,
    ).not.toContain(
      'Descreva o impacto de migração em Configuração, migração e segurança.',
    );
  });

  it('mantém heurísticas apenas como warnings', () => {
    const result = evaluatePullRequest(
      facts({
        body: '## Resumo\n\nAtualiza configuração.',
        files: ['src/main.ts', '.github/workflows/ci.yml'],
        additions: 501,
        deletions: 0,
      }),
    );
    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual([
      'PR grande: considere dividir a mudança para facilitar a revisão.',
      'Há alteração em src/ sem teste modificado; confirme a cobertura no PR.',
      'Arquivos sensíveis foram alterados; descreva o contexto em Configuração, migração e segurança.',
    ]);
  });
});

export interface PullRequestFacts {
  title: string;
  body: string | null;
  authorLogin: string;
  baseBranch: string;
  headBranch: string;
  files: string[];
  additions: number;
  deletions: number;
}

export interface PolicyResults {
  failures: string[];
  warnings: string[];
}

const conventionalTitle =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9-]+\))?!?: .+[^.]$/;
const artifactPath = /^(dist|coverage)(\/|$)/;
const behavioralPath = /^src\//;
const testPath = /^tests\/.*\.test\.ts$/;
const httpPath = /^src\/(?:adapters\/http|contracts\/http)\//;
const migrationPath = /(^|\/)migrations?\//;
const sensitivePath =
  /^(\.github\/workflows\/|package(?:-lock)?\.json$|Dockerfile$|scripts\/|\.npmrc$)/;

function section(body: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = body.match(
    new RegExp(
      `^## ${escapedHeading}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`,
      'im',
    ),
  );
  return match?.[1] ?? '';
}

function meaningfulText(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*[-*]\s*$/gm, '')
    .replace(/^\s*- \[[ x]\].*$/gim, '')
    .replace(/[#*_`>]/g, '')
    .trim();
}

function hasPromotionField(body: string, label: string): boolean {
  const line = section(body, 'Homologação e produção')
    .split('\n')
    .find((candidate) => candidate.trim().startsWith(`- ${label}:`));
  return meaningfulText(line?.slice(line.indexOf(':') + 1) ?? '').length > 0;
}

export function evaluatePullRequest(facts: PullRequestFacts): PolicyResults {
  const failures: string[] = [];
  const warnings: string[] = [];
  const body = facts.body ?? '';

  if (!conventionalTitle.test(facts.title.trim())) {
    failures.push('Use um título no formato Conventional Commits.');
  }

  if (
    facts.authorLogin !== 'dependabot[bot]' &&
    meaningfulText(section(body, 'Resumo')).length === 0
  ) {
    failures.push('Preencha a seção Resumo com uma descrição objetiva.');
  }

  if (facts.baseBranch === 'main' && facts.headBranch !== 'development') {
    failures.push('Pull requests para main devem ter origem em development.');
  }

  if (facts.baseBranch === 'main' && facts.headBranch === 'development') {
    for (const field of [
      'Ambiente de homologação e resultado',
      'Impacto de produção',
      'Plano de rollback',
    ]) {
      if (!hasPromotionField(body, field)) {
        failures.push(`Preencha o campo de promoção: ${field}.`);
      }
    }
  }

  const artifacts = facts.files.filter((file) => artifactPath.test(file));
  if (artifacts.length > 0) {
    failures.push(`Não versione artefatos gerados: ${artifacts.join(', ')}.`);
  }

  if (
    facts.files.some((file) => httpPath.test(file)) &&
    meaningfulText(section(body, 'Interface HTTP')).length === 0
  ) {
    failures.push('Descreva o impacto HTTP na seção Interface HTTP.');
  }

  if (
    facts.files.some((file) => migrationPath.test(file)) &&
    meaningfulText(section(body, 'Configuração, migração e segurança'))
      .length === 0
  ) {
    failures.push(
      'Descreva o impacto de migração em Configuração, migração e segurança.',
    );
  }

  if (facts.files.length > 30 || facts.additions + facts.deletions > 500) {
    warnings.push(
      'PR grande: considere dividir a mudança para facilitar a revisão.',
    );
  }

  if (
    facts.files.some((file) => behavioralPath.test(file)) &&
    !facts.files.some((file) => testPath.test(file))
  ) {
    warnings.push(
      'Há alteração em src/ sem teste modificado; confirme a cobertura no PR.',
    );
  }

  if (
    facts.files.some((file) => sensitivePath.test(file)) &&
    meaningfulText(section(body, 'Configuração, migração e segurança'))
      .length === 0
  ) {
    warnings.push(
      'Arquivos sensíveis foram alterados; descreva o contexto em Configuração, migração e segurança.',
    );
  }

  return { failures, warnings };
}

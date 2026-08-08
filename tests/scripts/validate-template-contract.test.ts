import {
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { validateTemplateContract } from '../../scripts/validate-template-contract.mjs';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
});

async function createFixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'template-contract-'));
  temporaryDirectories.push(directory);
  await cp(repositoryRoot, directory, {
    filter: (path) =>
      !path.includes('/node_modules') &&
      !path.includes('/.git') &&
      !path.includes('/dist'),
    recursive: true,
  });
  return directory;
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe('validateTemplateContract', () => {
  it('aceita o contrato do template', async () => {
    await expect(
      validateTemplateContract(repositoryRoot),
    ).resolves.toBeUndefined();
  });

  it('aceita contrato após renderizar todas as variáveis declaradas', async () => {
    const directory = await createFixture();
    const replacements = new Map([
      ['{{projectName}}', 'registry-harness-api'],
      ['{{description}}', 'API criada pelo registry integration harness'],
    ]);

    for (const relativePath of [
      'package.json',
      'package-lock.json',
      '.env.example',
      'README.md',
    ]) {
      const path = join(directory, relativePath);
      let content = await readFile(path, 'utf8');
      for (const [placeholder, value] of replacements) {
        content = content.replaceAll(placeholder, value);
      }
      await writeFile(path, content);
    }

    await expect(validateTemplateContract(directory)).resolves.toBeUndefined();
  });

  it('rejeita variável sem placeholder enquanto a fonte ainda não foi totalmente renderizada', async () => {
    const directory = await createFixture();
    for (const relativePath of ['package.json', 'README.md']) {
      const path = join(directory, relativePath);
      const content = await readFile(path, 'utf8');
      await writeFile(
        path,
        content.replaceAll(
          '{{description}}',
          'API criada pelo registry integration harness',
        ),
      );
    }

    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'Placeholder declarado sem uso em render.include: {{description}}',
    );
  });

  it('rejeita toolchain.steps como array', async () => {
    const directory = await createFixture();
    const manifest = await readJson(join(directory, 'template.json'));
    (manifest.toolchain as { steps: unknown }).steps = [];
    await writeJson(join(directory, 'template.json'), manifest);

    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'template.json não atende ao schema v1',
    );
  });

  it('rejeita path traversal em render.include', async () => {
    const directory = await createFixture();
    const manifest = await readJson(join(directory, 'template.json'));
    const render = manifest.render as { include: string[] };
    render.include[0] = '../package.json';
    await writeJson(join(directory, 'template.json'), manifest);

    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'template.json não atende ao schema v1',
    );
  });

  it('rejeita link simbólico em render.include', async () => {
    const directory = await createFixture();
    await symlink('README.md', join(directory, 'linked-readme.md'));
    const manifest = await readJson(join(directory, 'template.json'));
    const render = manifest.render as { include: string[] };
    render.include.push('linked-readme.md');
    await writeJson(join(directory, 'template.json'), manifest);

    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'arquivo regular',
    );
  });

  it('rejeita arquivo declarado ausente', async () => {
    const directory = await createFixture();
    const manifest = await readJson(join(directory, 'template.json'));
    const render = manifest.render as { include: string[] };
    render.include.push('missing.md');
    await writeJson(join(directory, 'template.json'), manifest);

    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'está ausente',
    );
  });

  it('rejeita placeholder não declarado', async () => {
    const directory = await createFixture();
    await writeFile(join(directory, 'README.md'), '{{unknownPlaceholder}}');

    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'Placeholder não declarado',
    );
  });

  it('rejeita script npm ausente', async () => {
    const directory = await createFixture();
    const packageJson = await readJson(join(directory, 'package.json'));
    delete (packageJson.scripts as Record<string, string>).lint;
    await writeJson(join(directory, 'package.json'), packageJson);

    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'Script npm ausente',
    );
  });

  it('rejeita package-lock ausente ou desalinhado', async () => {
    const directory = await createFixture();
    await rm(join(directory, 'package-lock.json'));
    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'Arquivo obrigatório ausente',
    );

    const mismatchedDirectory = await createFixture();
    const lock = await readJson(join(mismatchedDirectory, 'package-lock.json'));
    (lock.packages as Record<string, Record<string, unknown>>)[''].version =
      '9.9.9';
    await writeJson(join(mismatchedDirectory, 'package-lock.json'), lock);
    await expect(validateTemplateContract(mismatchedDirectory)).rejects.toThrow(
      'package-lock.json está desalinhado',
    );
  });

  it('rejeita comando e DAG fora da allowlist', async () => {
    const directory = await createFixture();
    const manifest = await readJson(join(directory, 'template.json'));
    const steps = (
      manifest.toolchain as { steps: Record<string, Record<string, unknown>> }
    ).steps;
    steps.install.command = 'sh';
    await writeJson(join(directory, 'template.json'), manifest);
    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'Step inválido ou ausente',
    );

    const cycleDirectory = await createFixture();
    const cycleManifest = await readJson(join(cycleDirectory, 'template.json'));
    const cycleSteps = (
      cycleManifest.toolchain as {
        steps: Record<string, Record<string, unknown>>;
      }
    ).steps;
    cycleSteps.install.dependsOn = ['build'];
    await writeJson(join(cycleDirectory, 'template.json'), cycleManifest);
    await expect(validateTemplateContract(cycleDirectory)).rejects.toThrow(
      'Comando ou dependências inválidos',
    );
  });

  it('rejeita schema vendorizado adulterado', async () => {
    const directory = await createFixture();
    await writeFile(
      join(directory, 'schemas/template-manifest-v1.schema.json'),
      '{}',
    );

    await expect(validateTemplateContract(directory)).rejects.toThrow(
      'digest canônico',
    );
  });
});

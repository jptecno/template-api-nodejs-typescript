import { describe, expect, it, vi } from 'vitest';

import {
  checkGeneratedProject,
  materializeGeneratedProject,
  smokeDockerImage,
  verifyGeneratedProject,
} from '../../scripts/verify-generated-project.mjs';

describe('materializeGeneratedProject', () => {
  it('usa o template, repositório, SHA e variáveis válidas definidos para a integração', async () => {
    const generateProject = vi.fn().mockResolvedValue(0);

    await materializeGeneratedProject({
      destination: '/tmp/generated-ci-api',
      expectedCommit: 'a'.repeat(40),
      generateProject,
      sourceDirectory: '/workspace',
    });

    expect(generateProject).toHaveBeenCalledWith({
      destination: '/tmp/generated-ci-api',
      expectedCommit: 'a'.repeat(40),
      expectedRepository: 'jptecno/template-api-nodejs-typescript',
      sourceDirectory: '/workspace',
      templateId: 'api-nodejs-typescript',
      variables: {
        description: 'Projeto de verificação gerado pela integração contínua',
        projectName: 'generated-ci-api',
      },
    });
  });

  it('rejeita quando a API programática não materializa o projeto', async () => {
    await expect(
      materializeGeneratedProject({
        destination: '/tmp/generated-ci-api',
        expectedCommit: 'a'.repeat(40),
        generateProject: vi.fn().mockResolvedValue(1),
        sourceDirectory: '/workspace',
      }),
    ).rejects.toThrow('A materialização do projeto gerado falhou com código 1');
  });
});

describe('checkGeneratedProject', () => {
  it('instala e executa a validação completa no diretório materializado', async () => {
    const runCommand = vi.fn().mockResolvedValue(undefined);

    await checkGeneratedProject({
      projectDirectory: '/tmp/generated-ci-api',
      runCommand,
    });

    expect(runCommand).toHaveBeenNthCalledWith(1, 'npm', ['ci'], {
      cwd: '/tmp/generated-ci-api',
    });
    expect(runCommand).toHaveBeenNthCalledWith(2, 'npm', ['run', 'check'], {
      cwd: '/tmp/generated-ci-api',
    });
  });
});

describe('smokeDockerImage', () => {
  it('constrói, executa e verifica a imagem gerada em loopback', async () => {
    const runCommand = vi.fn().mockResolvedValue(undefined);
    const fetchHealth = vi.fn().mockResolvedValue(undefined);

    await smokeDockerImage({
      containerName: 'generated-api-nodejs-typescript-smoke',
      fetchHealth,
      imageName: 'generated-api-nodejs-typescript',
      projectDirectory: '/tmp/generated-ci-api',
      runCommand,
    });

    expect(runCommand).toHaveBeenNthCalledWith(
      1,
      'docker',
      ['build', '--no-cache', '--tag', 'generated-api-nodejs-typescript', '.'],
      { cwd: '/tmp/generated-ci-api' },
    );
    expect(runCommand).toHaveBeenNthCalledWith(2, 'docker', [
      'run',
      '--detach',
      '--name',
      'generated-api-nodejs-typescript-smoke',
      '--publish',
      '127.0.0.1:3000:3000',
      '--env',
      'DATABASE_URL=postgresql://smoke:smoke@127.0.0.1:5432/smoke',
      'generated-api-nodejs-typescript',
    ]);
    expect(runCommand).toHaveBeenNthCalledWith(3, 'docker', [
      'exec',
      'generated-api-nodejs-typescript-smoke',
      'sh',
      '-c',
      'test "$(id -u)" -ne 0 && test ! -d /app/node_modules/vitest',
    ]);
    expect(fetchHealth).toHaveBeenCalledWith('http://127.0.0.1:3000/health');
  });
});

describe('verifyGeneratedProject', () => {
  it('remove o container e o diretório temporário mesmo quando a validação falha', async () => {
    const runCommand = vi.fn().mockImplementation((command, arguments_) => {
      if (command === 'npm' && arguments_[1] === 'check') {
        return Promise.reject(new Error('check falhou'));
      }
      return Promise.resolve();
    });
    const removeTemporaryDirectory = vi.fn().mockResolvedValue(undefined);

    await expect(
      verifyGeneratedProject({
        containerName: 'generated-api-nodejs-typescript-smoke',
        createTemporaryDirectory: vi.fn().mockResolvedValue('/tmp/harness'),
        expectedCommit: 'a'.repeat(40),
        fetchHealth: vi.fn(),
        generateProject: vi.fn().mockResolvedValue(0),
        imageName: 'generated-api-nodejs-typescript',
        removeTemporaryDirectory,
        runCommand,
        sourceDirectory: '/workspace',
      }),
    ).rejects.toThrow('check falhou');

    expect(runCommand).toHaveBeenCalledWith('docker', [
      'rm',
      '--force',
      'generated-api-nodejs-typescript-smoke',
    ]);
    expect(removeTemporaryDirectory).toHaveBeenCalledWith('/tmp/harness');
  });
});

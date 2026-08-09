import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateProjectFromWorktree } from '@jptecno/cli/dist/harness/generate-project-from-worktree.js';

const templateId = 'api-nodejs-typescript';
const repository = 'jptecno/template-api-nodejs-typescript';
const imageName = 'generated-api-nodejs-typescript';
const containerName = 'generated-api-nodejs-typescript-smoke';

export function runCommand(command, arguments_, options = {}) {
  const { cwd, spawnProcess = spawn } = options;

  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, arguments_, {
      cwd,
      shell: false,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${arguments_.join(' ')} falhou com ${signal ?? `código ${code}`}`,
        ),
      );
    });
  });
}

export async function materializeGeneratedProject(options) {
  const result = await options.generateProject({
    destination: options.destination,
    expectedCommit: options.expectedCommit,
    expectedRepository: repository,
    sourceDirectory: options.sourceDirectory,
    templateId,
    variables: {
      description: 'Projeto de verificação gerado pela integração contínua',
      projectName: 'generated-ci-api',
    },
  });

  if (result !== 0) {
    throw new Error(
      `A materialização do projeto gerado falhou com código ${result}`,
    );
  }
}

export async function checkGeneratedProject(options) {
  await options.runCommand('npm', ['ci'], { cwd: options.projectDirectory });
  await options.runCommand('npm', ['run', 'check'], {
    cwd: options.projectDirectory,
  });
}

export async function smokeDockerImage(options) {
  await options.runCommand(
    'docker',
    ['build', '--no-cache', '--tag', options.imageName, '.'],
    { cwd: options.projectDirectory },
  );
  await options.runCommand('docker', [
    'run',
    '--detach',
    '--name',
    options.containerName,
    '--publish',
    '127.0.0.1:3000:3000',
    '--env',
    'DATABASE_URL=postgresql://smoke:smoke@127.0.0.1:5432/smoke',
    options.imageName,
  ]);
  await options.runCommand('docker', [
    'exec',
    options.containerName,
    'sh',
    '-c',
    'test "$(id -u)" -ne 0 && test ! -d /app/node_modules/vitest',
  ]);

  await options.fetchHealth('http://127.0.0.1:3000/health');
}

export async function verifyGeneratedProject(options) {
  const temporaryDirectory = await options.createTemporaryDirectory();
  const projectDirectory = join(temporaryDirectory, 'generated-ci-api');

  try {
    await materializeGeneratedProject({
      destination: projectDirectory,
      expectedCommit: options.expectedCommit,
      generateProject: options.generateProject,
      sourceDirectory: options.sourceDirectory,
    });
    await checkGeneratedProject({
      projectDirectory,
      runCommand: options.runCommand,
    });
    await smokeDockerImage({
      containerName: options.containerName,
      fetchHealth: options.fetchHealth,
      imageName: options.imageName,
      projectDirectory,
      runCommand: options.runCommand,
    });
  } finally {
    await Promise.allSettled([
      options.runCommand('docker', ['rm', '--force', options.containerName]),
      options.removeTemporaryDirectory(temporaryDirectory),
    ]);
  }
}

async function fetchHealth(url) {
  let lastError;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health check respondeu ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw lastError ?? new Error('Health check não respondeu');
}

export async function main(environment = process.env) {
  const expectedCommit = environment.GITHUB_SHA;
  if (!expectedCommit) {
    throw new Error('GITHUB_SHA é obrigatório para verificar o projeto gerado');
  }

  await verifyGeneratedProject({
    containerName,
    createTemporaryDirectory: () =>
      mkdtemp(join(tmpdir(), 'generated-project-')),
    expectedCommit,
    fetchHealth,
    generateProject: generateProjectFromWorktree,
    imageName,
    removeTemporaryDirectory: (directory) =>
      rm(directory, { force: true, recursive: true }),
    runCommand,
    sourceDirectory: process.cwd(),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

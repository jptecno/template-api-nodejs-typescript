import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';

const schemaRelativePath = 'schemas/template-manifest-v1.schema.json';
const schemaDigestRelativePath =
  'schemas/template-manifest-v1.schema.sha256.json';
const manifestRelativePath = 'template.json';
const packageRelativePath = 'package.json';
const lockRelativePath = 'package-lock.json';
const ignoredDirectories = new Set([
  '.agents',
  '.git',
  '.github',
  'coverage',
  'dist',
  'docs',
  'node_modules',
  'schemas',
  'scripts',
  'tests',
]);
const placeholderPattern = /{{([A-Za-z][A-Za-z0-9_]*)}}/g;
const expectedSteps = {
  install: { args: ['install'], dependsOn: [] },
  formatCheck: {
    args: ['run', 'format:check'],
    dependsOn: ['install'],
  },
  lint: { args: ['run', 'lint'], dependsOn: ['formatCheck'] },
  typecheck: { args: ['run', 'typecheck'], dependsOn: ['lint'] },
  test: { args: ['run', 'test'], dependsOn: ['typecheck'] },
  build: { args: ['run', 'build'], dependsOn: ['test'] },
};

export async function validateTemplateContract(rootDirectory) {
  const root = resolve(rootDirectory);
  const [manifest, packageJson, packageLock, schema, schemaDigest] =
    await Promise.all([
      readJson(root, manifestRelativePath),
      readJson(root, packageRelativePath),
      readJson(root, lockRelativePath),
      readJson(root, schemaRelativePath),
      readJson(root, schemaDigestRelativePath),
    ]);

  await validateSchemaDigest(root, schemaDigest);
  validateManifestSchema(schema, manifest);
  await validateRenderFiles(root, manifest);
  await validatePlaceholders(root, manifest);
  validatePackageLock(packageJson, packageLock);
  validateToolchain(manifest, packageJson);
}

async function readJson(root, relativePath) {
  const path = resolveSafePath(root, relativePath);
  const details = await lstat(path).catch(() => {
    throw new Error(`Arquivo obrigatório ausente: ${relativePath}`);
  });

  if (!details.isFile()) {
    throw new Error(`O caminho deve ser um arquivo regular: ${relativePath}`);
  }

  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new Error(`JSON inválido: ${relativePath}`);
  }
}

function validateSchemaDigest(root, schemaDigest) {
  if (
    !isRecord(schemaDigest) ||
    typeof schemaDigest.canonicalSource !== 'string' ||
    typeof schemaDigest.canonicalRevision !== 'string' ||
    !/^[a-f0-9]{40}$/.test(schemaDigest.canonicalRevision) ||
    typeof schemaDigest.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(schemaDigest.sha256)
  ) {
    throw new Error('Metadados inválidos do schema vendorizado');
  }

  const schemaPath = resolveSafePath(root, schemaRelativePath);
  return readFile(schemaPath).then((content) => {
    const digest = createHash('sha256').update(content).digest('hex');
    if (digest !== schemaDigest.sha256) {
      throw new Error(
        'O schema vendorizado diverge do digest canônico registrado',
      );
    }
  });
}

function validateManifestSchema(schema, manifest) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);

  if (!validate(manifest)) {
    const errors = ajv.errorsText(validate.errors, { separator: '; ' });
    throw new Error(`template.json não atende ao schema v1: ${errors}`);
  }
}

async function validateRenderFiles(root, manifest) {
  for (const relativePath of manifest.render.include) {
    const path = resolveSafePath(root, relativePath);
    const details = await lstat(path).catch(() => {
      throw new Error(
        `Arquivo declarado em render.include está ausente: ${relativePath}`,
      );
    });

    if (!details.isFile()) {
      throw new Error(
        `render.include deve apontar para arquivo regular: ${relativePath}`,
      );
    }
  }
}

async function validatePlaceholders(root, manifest) {
  const declared = new Set(manifest.variables.map((variable) => variable.name));
  const includedFiles = new Set(manifest.render.include);
  const found = new Map([...declared].map((name) => [name, new Set()]));
  const files = await listTemplateFiles(root);

  for (const relativePath of files) {
    const content = await readFile(resolveSafePath(root, relativePath), 'utf8');
    for (const placeholder of content.matchAll(placeholderPattern)) {
      const name = placeholder[1];
      if (!declared.has(name)) {
        throw new Error(
          `Placeholder não declarado: {{${name}}} em ${relativePath}`,
        );
      }
      if (!includedFiles.has(relativePath)) {
        throw new Error(
          `Placeholder fora de render.include: {{${name}}} em ${relativePath}`,
        );
      }
      found.get(name).add(relativePath);
    }
  }

  for (const [name, paths] of found) {
    if (paths.size === 0) {
      throw new Error(
        `Placeholder declarado sem uso em render.include: {{${name}}}`,
      );
    }
  }
}

async function listTemplateFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(
          ...(await listTemplateFiles(root, resolve(directory, entry.name))),
        );
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(relative(root, resolve(directory, entry.name)));
    }
  }

  return files;
}

function validatePackageLock(packageJson, packageLock) {
  if (
    !isRecord(packageJson) ||
    !isRecord(packageLock) ||
    !isRecord(packageLock.packages)
  ) {
    throw new Error(
      'package.json ou package-lock.json possui estrutura inválida',
    );
  }

  const rootPackage = packageLock.packages[''];
  if (!isRecord(rootPackage)) {
    throw new Error('package-lock.json não possui o pacote raiz');
  }

  for (const property of [
    'name',
    'version',
    'dependencies',
    'devDependencies',
  ]) {
    if (
      JSON.stringify(packageJson[property]) !==
      JSON.stringify(rootPackage[property])
    ) {
      throw new Error(
        `package-lock.json está desalinhado de package.json em ${property}`,
      );
    }
  }
}

function validateToolchain(manifest, packageJson) {
  const requirements = new Map(
    manifest.toolchain.requirements.map((requirement) => [
      requirement.tool,
      requirement,
    ]),
  );
  for (const [tool, minimumVersion] of [
    ['node', '24.0.0'],
    ['npm', '11.0.0'],
  ]) {
    if (requirements.get(tool)?.minimumVersion !== minimumVersion) {
      throw new Error(
        `Requisito obrigatório inválido: ${tool} >= ${minimumVersion}`,
      );
    }
  }

  const steps = manifest.toolchain.steps;
  const stepEntries = Object.entries(steps);
  if (stepEntries.length !== Object.keys(expectedSteps).length) {
    throw new Error(
      'toolchain deve declarar exatamente os seis steps aprovados',
    );
  }

  for (const [name, expected] of Object.entries(expectedSteps)) {
    const step = steps[name];
    if (step?.command !== 'npm') {
      throw new Error(`Step inválido ou ausente: ${name}`);
    }
    if (
      !sameStrings(step.args, expected.args) ||
      !sameStrings(step.dependsOn, expected.dependsOn)
    ) {
      throw new Error(`Comando ou dependências inválidos no step: ${name}`);
    }
    if (typeof step.recommended !== 'boolean') {
      throw new Error(`recommended inválido no step: ${name}`);
    }

    if (
      step.args[0] === 'run' &&
      typeof packageJson.scripts?.[step.args[1]] !== 'string'
    ) {
      throw new Error(
        `Script npm ausente para o step ${name}: ${step.args[1]}`,
      );
    }
  }

  for (const [, step] of stepEntries) {
    for (const dependency of step.dependsOn) {
      if (!Object.hasOwn(steps, dependency)) {
        throw new Error(`Dependência inexistente no toolchain: ${dependency}`);
      }
    }
  }
  ensureAcyclicSteps(steps);
}

function ensureAcyclicSteps(steps) {
  const visiting = new Set();
  const visited = new Set();

  function visit(name) {
    if (visiting.has(name)) {
      throw new Error(`Ciclo detectado no toolchain: ${name}`);
    }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dependency of steps[name].dependsOn) visit(dependency);
    visiting.delete(name);
    visited.add(name);
  }

  for (const name of Object.keys(steps)) visit(name);
}

function resolveSafePath(root, relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new Error('Caminho relativo inválido');
  }
  const path = resolve(root, relativePath);
  const pathRelativeToRoot = relative(root, path);
  if (
    pathRelativeToRoot === '..' ||
    pathRelativeToRoot.startsWith(`..${sep}`)
  ) {
    throw new Error(`Caminho fora do template: ${relativePath}`);
  }
  return path;
}

function sameStrings(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const invokedPath = process.argv[1] && resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? process.cwd();
  validateTemplateContract(root).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

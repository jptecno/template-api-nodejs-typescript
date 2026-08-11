export interface RunCommandOptions {
  cwd?: string;
}

export type RunCommand = (
  command: string,
  arguments_: string[],
  options?: RunCommandOptions,
) => Promise<void>;

export interface MaterializeGeneratedProjectOptions {
  destination: string;
  expectedCommit: string;
  generateProject: (options: Record<string, unknown>) => Promise<number>;
  sourceDirectory: string;
}

export function materializeGeneratedProject(
  options: MaterializeGeneratedProjectOptions,
): Promise<void>;

export function checkGeneratedProject(options: {
  projectDirectory: string;
  runCommand: RunCommand;
}): Promise<void>;

export interface SmokeDockerImageOptions {
  containerName: string;
  fetchHealth: (url: string) => Promise<void>;
  imageName: string;
  projectDirectory: string;
  runCommand: RunCommand;
}

export function smokeDockerImage(
  options: SmokeDockerImageOptions,
): Promise<void>;

export interface VerifyGeneratedProjectOptions {
  containerName: string;
  createTemporaryDirectory: () => Promise<string>;
  expectedCommit: string;
  fetchHealth: (url: string) => Promise<void>;
  generateProject: (options: Record<string, unknown>) => Promise<number>;
  imageName: string;
  removeTemporaryDirectory: (directory: string) => Promise<void>;
  runCommand: RunCommand;
  sourceDirectory: string;
}

export function verifyGeneratedProject(
  options: VerifyGeneratedProjectOptions,
): Promise<void>;

export function main(environment?: NodeJS.ProcessEnv): Promise<void>;

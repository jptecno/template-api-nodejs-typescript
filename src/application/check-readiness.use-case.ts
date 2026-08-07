import type { ReadinessCheckPort } from './ports/readiness-check.port.js';

export class CheckReadinessUseCase {
  constructor(
    private readonly readinessCheck: ReadinessCheckPort,
    private readonly timeoutMilliseconds: number,
  ) {}

  async execute(): Promise<void> {
    let timeout: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        this.readinessCheck.check(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Readiness check timed out')),
            this.timeoutMilliseconds,
          );
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}

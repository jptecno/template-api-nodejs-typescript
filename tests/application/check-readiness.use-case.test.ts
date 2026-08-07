import { describe, expect, it, vi } from 'vitest';

import { CheckReadinessUseCase } from '../../src/application/check-readiness.use-case.js';

describe('CheckReadinessUseCase', () => {
  it('executa a verificação de prontidão', async () => {
    const check = vi.fn<() => Promise<void>>().mockResolvedValue();
    const useCase = new CheckReadinessUseCase({ check }, 1_000);

    await useCase.execute();

    expect(check).toHaveBeenCalledOnce();
  });

  it('falha quando a verificação excede o orçamento configurado', async () => {
    const useCase = new CheckReadinessUseCase(
      { check: () => new Promise(() => undefined) },
      10,
    );

    await expect(useCase.execute()).rejects.toThrow(
      'Readiness check timed out',
    );
  });
});

import { sql } from 'kysely';

import type { ReadinessCheckPort } from '../../../application/ports/readiness-check.port.js';
import type { Database } from './kysely-database.factory.js';

export class KyselyReadinessCheckAdapter implements ReadinessCheckPort {
  constructor(private readonly database: Database) {}

  async check(): Promise<void> {
    await sql`select 1`.execute(this.database);
  }
}

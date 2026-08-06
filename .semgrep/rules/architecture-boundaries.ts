// ruleid: domain-imports-infrastructure, application-imports-outward
import { readFile } from 'node:fs/promises';
// ruleid: domain-imports-infrastructure, application-imports-outward
import Fastify from 'fastify';
// ruleid: domain-imports-infrastructure, application-imports-outward
import { Kysely } from 'kysely';
// ruleid: domain-imports-infrastructure, application-imports-outward
import { database } from '../adapters/persistence/database.js';
// ruleid: domain-imports-infrastructure, application-imports-outward
import { createApplication } from '../composition/create-application.js';
// ok: domain-imports-infrastructure
// ok: application-imports-outward
import type { User } from '../domain/user.js';

void readFile;
void Fastify;
void Kysely;
void database;
void createApplication;
void (undefined as unknown as User);

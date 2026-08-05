import { createApplication } from './composition/create-application.js';
import { readEnvironment } from './composition/read-environment.js';

const environment = readEnvironment(process.env);
const app = createApplication(environment);

await app.listen({ host: '0.0.0.0', port: environment.port });

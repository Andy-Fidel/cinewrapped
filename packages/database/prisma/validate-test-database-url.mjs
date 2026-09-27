const rawUrl = process.env.TEST_DATABASE_URL;

if (rawUrl === undefined) {
  throw new Error('TEST_DATABASE_URL is required.');
}

const url = new URL(rawUrl);
const databaseName = url.pathname.slice(1);
const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);

if (!localHosts.has(url.hostname) || !databaseName.endsWith('_test')) {
  throw new Error(
    'Refusing to prepare a database unless it is local and its name ends with "_test".',
  );
}

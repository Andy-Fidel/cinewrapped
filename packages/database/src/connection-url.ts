export function withPrismaConnectionLimit(databaseUrl: string, connectionLimit: number): string {
  const url = new URL(databaseUrl);

  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', String(connectionLimit));
  }

  return url.toString();
}

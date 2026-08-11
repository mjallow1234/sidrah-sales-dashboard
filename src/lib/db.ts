import mysql from 'mysql2/promise';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function getDbConfig(): DbConfig {
  return {
    host: getEnvVar('MYSQL_HOST'),
    port: parsePositiveInt(process.env.MYSQL_PORT ?? '', 3306),
    user: getEnvVar('MYSQL_USER'),
    password: getEnvVar('MYSQL_PASSWORD'),
    database: getEnvVar('MYSQL_DATABASE'),
    connectionLimit: parsePositiveInt(process.env.MYSQL_CONNECTION_LIMIT ?? '', 10),
  };
}

export type QueryParams = readonly unknown[] | Record<string, unknown>;

declare global {
  // eslint-disable-next-line no-var
  var __sidrahMysqlPool: mysql.Pool | undefined;
}

function createPool() {
  const config = getDbConfig();
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    namedPlaceholders: true,
  });
}

function getPoolInternal(): mysql.Pool {
  if (!global.__sidrahMysqlPool) {
    global.__sidrahMysqlPool = createPool();
  }
  return global.__sidrahMysqlPool;
}

function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string };
  return err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED';
}

export async function execute<T = any>(sql: string, params: QueryParams = []): Promise<[T, mysql.FieldPacket[]]> {
  try {
    return (await getPoolInternal().execute(sql, params as any)) as [T, mysql.FieldPacket[]];
  } catch (error) {
    if (isConnectionError(error)) {
      await reconnect();
      return (await getPoolInternal().execute(sql, params as any)) as [T, mysql.FieldPacket[]];
    }
    throw error;
  }
}

export async function query<T = any>(sql: string, params: QueryParams = []): Promise<[T, mysql.FieldPacket[]]> {
  try {
    return (await getPoolInternal().query(sql, params as any)) as [T, mysql.FieldPacket[]];
  } catch (error) {
    if (isConnectionError(error)) {
      await reconnect();
      return (await getPoolInternal().query(sql, params as any)) as [T, mysql.FieldPacket[]];
    }
    throw error;
  }
}

export async function transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPoolInternal().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Failed to rollback transaction', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

export function getPool(): mysql.Pool {
  return getPoolInternal();
}

async function reconnect(): Promise<void> {
  const currentPool = getPool();
  try {
    await currentPool.end();
  } catch {
    // ignore cleanup errors
  }
  const newPool = createPool();
  global.__sidrahMysqlPool = newPool;
}

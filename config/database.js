import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function parseDatabaseUrl(url) {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: urlObj.port ? Number(urlObj.port) : 3306,
      user: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.slice(1)
    };
  } catch (error) {
    return null;
  }
}

const isProduction = process.env.ENVIRONMENT === 'prod';

let dbConfig;

if (isProduction) {
  const mysqlUrl = process.env.MYSQL_PUBLIC_URL;
  const urlConfig = parseDatabaseUrl(mysqlUrl);

  if (!urlConfig) {
    throw new Error('production missing db url');
  }

  dbConfig = {
    host: urlConfig.host,
    port: urlConfig.port,
    user: urlConfig.user,
    password: urlConfig.password,
    database: urlConfig.database,
  };
} else {
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 8889,
    database: process.env.DB_NAME || 'issue_tracker',
  };
}

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;


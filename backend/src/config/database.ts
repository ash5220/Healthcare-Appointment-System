import { Sequelize } from 'sequelize';
import { env, isProduction } from './env';
import { logger } from './logger';
import { DB_POOL_MIN, DB_POOL_MAX } from './constants';

const dbHost: string = env.dbHost;
const dbPort: number = env.dbPort;
const dbName: string = env.dbName;
const dbUser: string = env.dbUser;
const dbPassword: string = env.dbPassword;
const isProd: () => boolean = isProduction;

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: dbHost,
  port: dbPort,
  database: dbName,
  username: dbUser,
  password: dbPassword,
  logging: false, // Set to false to prevent logging every SQL script to console
  pool: {
    max: isProd() ? DB_POOL_MAX : 5,
    min: isProd() ? DB_POOL_MIN : 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  dialectOptions: {
    charset: 'utf8mb4',
    dateStrings: true,
    typeCast: true,
    // Enforce TLS for database connections in production.
    // HIPAA §164.312(e)(1) requires encryption for PHI in transit.
    // mysql2 uses the Node.js tls module; setting ssl to true triggers
    // TLS negotiation and rejects unverified server certificates.
    ...(isProd() && {
      ssl: {
        rejectUnauthorized: true,
      },
    }),
  },
  timezone: '+00:00', // UTC timezone
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Migration-first lifecycle: do not mutate schema implicitly.
    // Explicitly opt-in to sync only for local prototyping.
    if (!isProduction() && process.env.ALLOW_DB_SYNC === 'true') {
      const forceSync = process.env.CLEAN_SYNC === 'true';
      await sequelize.sync({ force: forceSync, alter: false });
      if (forceSync) {
        logger.warn('CLEAN_SYNC=true: all tables were dropped and recreated.');
      }
      logger.warn('ALLOW_DB_SYNC=true enabled. Prefer migrations for all schema changes.');
    } else {
      logger.info('Skipping sequelize.sync(). Run migrations with "npm run migrate".');
    }
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed.');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

export { sequelize };

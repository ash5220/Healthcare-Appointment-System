import { Sequelize } from 'sequelize';
import { env, isProduction } from './env';
import { logger } from './logger';
import { DB_POOL_MIN, DB_POOL_MAX } from './constants';

const sequelize = new Sequelize({
    dialect: 'mysql',
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbName,
    username: env.dbUser,
    password: env.dbPassword,
    logging: false, // Set to false to prevent logging every SQL script to console
    pool: {
        max: isProduction() ? DB_POOL_MAX : 5,
        min: isProduction() ? DB_POOL_MIN : 0,
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
    },
    timezone: '+00:00', // UTC timezone
});

export const initializeDatabase = async (): Promise<void> => {
    try {
        await sequelize.authenticate();
        logger.info('Database connection has been established successfully.');

        // Sync models with database (use migrations in production)
        if (!isProduction()) {
            const forceSync = process.env.CLEAN_SYNC === 'true';
            try {
                await sequelize.sync({ force: forceSync, alter: !forceSync });
                if (forceSync) {
                    logger.warn('CLEAN_SYNC=true: all tables were dropped and recreated.');
                }
                logger.info('Database models synchronized.');
            } catch (syncError) {
                // Log the full error details (MySQL errors often have an empty .message but
                // populate .original or .parent with the real cause).
                const errAny = syncError as Record<string, unknown>;
                const mysqlMessage =
                    (errAny?.original as Error)?.message ||
                    (errAny?.parent as Error)?.message ||
                    (syncError instanceof Error ? syncError.message : String(syncError));
                logger.warn(
                    `⚠️  Database model sync failed (${mysqlMessage}). ` +
                    'The server will start but some schema changes may not be applied. ' +
                    'You can run with CLEAN_SYNC=true to reset the schema.'
                );
            }
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

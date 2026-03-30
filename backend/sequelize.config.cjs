require('dotenv').config();

const baseConfig = {
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'healthcare_appointment_system',
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
    timestamps: true,
  },
};

module.exports = {
  development: { ...baseConfig },
  test: {
    ...baseConfig,
    database: process.env.DB_NAME_TEST || `${baseConfig.database}_test`,
  },
  production: { ...baseConfig },
};

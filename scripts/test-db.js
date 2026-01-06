import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    try {
        const isProduction = process.env.ENVIRONMENT === 'prod';
        console.log('Testing database connection...');
        console.log('Environment:', isProduction ? 'PRODUCTION (Railway)' : 'DEVELOPMENT (Local)');
        console.log('Environment variables:');

        if (isProduction) {
            console.log('- MYSQL_PUBLIC_URL:', process.env.MYSQL_PUBLIC_URL ? 'Set (hidden)' : 'Not set');
            console.log('- MYSQL_URL:', process.env.MYSQL_URL ? 'Set (hidden)' : 'Not set');
        } else {
            console.log('- DB_HOST:', process.env.DB_HOST || 'Not set');
            console.log('- DB_USER:', process.env.DB_USER || 'Not set');
            console.log('- DB_NAME:', process.env.DB_NAME || 'Not set');
            console.log('- DB_PORT:', process.env.DB_PORT || 'Not set');
        }
        console.log('');

        const connection = await pool.getConnection();
        console.log('✓ Database connection successful!');

        const [versionRows] = await connection.query('SELECT VERSION() as version');
        const [dbRows] = await connection.query('SELECT DATABASE() as db_name');
        const [hostRows] = await connection.query('SELECT @@hostname as hostname, @@port as port');

        console.log('MySQL Version:', versionRows[0].version);
        console.log('Current Database:', dbRows[0].db_name);
        console.log('Connected to Host:', hostRows[0].hostname);
        console.log('Port:', hostRows[0].port);

        const [tables] = await connection.query('SHOW TABLES');
        console.log('\nExisting tables:', tables.length > 0 ? tables.map(t => Object.values(t)[0]).join(', ') : 'None');

        if (tables.length > 0) {
            const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
            const [issues] = await connection.query('SELECT COUNT(*) as count FROM issues');
            console.log('Users count:', users[0].count);
            console.log('Issues count:', issues[0].count);
        }

        connection.release();
        console.log('\n✓ Connection test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('✗ Database connection failed:');
        console.error('Error:', error.message);
        console.error('\nPlease check:');
        console.error('1. MYSQL_URL or DB_* environment variables are set correctly');
        console.error('2. Database server is accessible');
        console.error('3. Database credentials are correct');
        process.exit(1);
    }
}

testConnection();


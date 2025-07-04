import pool from './config/database';

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    
    // Test if database exists
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('Available databases:', databases);
    
    // Test if poker_app database exists and switch to it
    await connection.query('USE poker_app');
    console.log('✅ Successfully switched to poker_app database');
    
    // Test if users table exists
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Available tables:', tables);
    
    // Test table structure
    const [tableStructure] = await connection.query('DESCRIBE users');
    console.log('Users table structure:', tableStructure);
    
    connection.release();
    console.log('✅ All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('🔧 Fix: Start MySQL service in XAMPP/WAMP');
      } else if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
        console.error('🔧 Fix: Check database credentials in .env file');
      } else if (error.message.includes('ER_BAD_DB_ERROR')) {
        console.error('🔧 Fix: Create poker_app database in phpMyAdmin');
      } else if (error.message.includes('ER_NO_SUCH_TABLE')) {
        console.error('🔧 Fix: Import schema_mysql.sql in phpMyAdmin');
      }
    }
  }
  
  process.exit(0);
}

testDatabaseConnection();

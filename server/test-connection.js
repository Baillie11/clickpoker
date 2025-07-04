const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testing connection with these settings:');
    console.log('Host:', process.env.DB_HOST);
    console.log('Port:', process.env.DB_PORT);
    console.log('User:', process.env.DB_USER);
    console.log('Password:', process.env.DB_PASSWORD ? '***' : '(empty)');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✅ Connected to MySQL successfully!');
    
    // Show existing databases
    const [rows] = await connection.execute('SHOW DATABASES');
    console.log('Available databases:', rows.map(row => row.Database));
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure XAMPP MySQL is running');
    console.error('2. Try connecting with different credentials');
    console.error('3. Check if MySQL is running on a different port');
  }
}

testConnection();

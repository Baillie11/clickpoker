# MySQL Database Setup for Poker App

## Option 1: Using XAMPP (Recommended for Windows)

### 1. Install XAMPP
1. Download XAMPP from [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. Install XAMPP with default settings
3. Start XAMPP Control Panel

### 2. Start Services
1. In XAMPP Control Panel, start:
   - **Apache** (for phpMyAdmin)
   - **MySQL** (database server)

### 3. Create Database
1. Open your web browser and go to: `http://localhost/phpmyadmin`
2. Click "New" in the left sidebar
3. Create a database named: `poker_app`
4. Click "Create"

### 4. Import Schema
1. Select the `poker_app` database
2. Click on the "SQL" tab
3. Copy and paste the contents of `schema_mysql.sql` into the text area
4. Click "Go" to execute

## Option 2: Using WAMP

### 1. Install WAMP
1. Download WAMP from [https://www.wampserver.com/](https://www.wampserver.com/)
2. Install and start WAMP
3. Wait for the WAMP icon to turn green

### 2. Access phpMyAdmin
1. Click on WAMP icon in system tray
2. Select "phpMyAdmin"
3. Follow steps 3-4 from XAMPP instructions above

## Option 3: Standalone MySQL

### 1. Install MySQL
1. Download MySQL from [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)
2. Install MySQL Server and MySQL Workbench
3. Set root password during installation

### 2. Create Database
1. Open MySQL Workbench
2. Connect to local instance
3. Run the following SQL:

```sql
CREATE DATABASE poker_app;
USE poker_app;
```

4. Copy and paste the contents of `schema_mysql.sql`
5. Execute the script

## Environment Configuration

1. Make sure your `server/.env` file has these MySQL settings:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=poker_app
DB_USER=root
DB_PASSWORD=
```

**Note**: If you set a MySQL root password, update `DB_PASSWORD` accordingly.

## Test Connection

1. Navigate to the server directory: `cd server`
2. Start the server: `npm run dev`
3. You should see: "Server and Socket.IO running on http://localhost:5000"
4. If you see database connection errors, check:
   - MySQL service is running
   - Database name is correct
   - Username/password are correct

## Default Data

The schema includes:
- All necessary tables for user management and poker games
- A default poker table named "Main Poker Table"
- Proper indexes for performance

You're now ready to register users and play poker! 🎮

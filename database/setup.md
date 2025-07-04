# Database Setup

## Prerequisites

1. Install PostgreSQL on your system
2. Create a PostgreSQL user and database

## Setup Steps

### 1. Create Database and User

Connect to PostgreSQL as superuser and run:

```sql
-- Create database
CREATE DATABASE poker_app;

-- Create user (replace 'password123' with a secure password)
CREATE USER postgres WITH PASSWORD 'password123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE poker_app TO postgres;

-- Connect to the poker_app database
\c poker_app

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO postgres;
```

### 2. Run Schema

Execute the schema.sql file to create tables:

```bash
psql -U postgres -d poker_app -f schema.sql
```

Or copy and paste the contents of `schema.sql` into your PostgreSQL client.

### 3. Update Environment Variables

Copy the `.env.example` file in the server directory to `.env` and update the database credentials:

```bash
cd server
cp .env.example .env
```

Edit the `.env` file with your actual database credentials.

### 4. Test Connection

Start the server and it should connect to the database automatically:

```bash
cd server
npm run dev
```

## Default Table

The system will automatically create a default poker table when the first user joins.

# Database Configuration Guide

## Overview
This document outlines the database setup and configuration for the Code Muse Board application. The application uses PostgreSQL as its primary database system, managed through Prisma ORM.

## Quick Start
1. Copy the environment template:
```bash
copy env.template .env
```

2. Update database credentials in `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/codemuse
SHADOW_DATABASE_URL=postgresql://username:password@localhost:5432/codemuse_shadow
```

3. Create required databases:
```bash
createdb codemuse
createdb codemuse_shadow
```

4. Run database migrations:
```bash
npx prisma migrate dev --name init
```

## Database Models

### News
Stores news articles and updates:
- `id`: UUID primary key
- `title`: Article title
- `description`: Article content
- `category`: News category
- `type`: Enum (breaking, alert, update)
- `timestamp`: Creation time
- `read`: Read status
- `summary`: Optional AI-generated summary
- `source`: Optional source URL
- `url`: Optional article URL
- `createdAt`: Record creation timestamp
- `updatedAt`: Last update timestamp

### ChatMessage
Manages real-time chat messages:
- `id`: UUID primary key
- `content`: Message content
- `username`: Sender's username
- `roomId`: Chat room identifier
- `timestamp`: Message timestamp

### ActivityLog
Tracks system activities:
- `id`: UUID primary key
- `action`: Activity description
- `details`: Optional additional information
- `category`: Activity category
- `importance`: Enum (HIGH, MEDIUM, LOW)
- `timestamp`: Activity timestamp

## Configuration Options

### Database Connection
```env
DATABASE_URL=postgresql://username:password@localhost:5432/codemuse
SHADOW_DATABASE_URL=postgresql://username:password@localhost:5432/codemuse_shadow
```

### Connection Pool Settings
```env
DB_POOL_SIZE=20          # Maximum number of connections in the pool
DB_MAX_CONNECTIONS=50    # Maximum total connections allowed
DB_IDLE_TIMEOUT=10000   # Connection idle timeout in milliseconds
```

## Migration Commands

### Create Migration
```bash
npx prisma migrate dev --name <migration_name>
```

### Apply Migrations
```bash
npx prisma migrate deploy
```

### Reset Database
```bash
npx prisma migrate reset
```

### View Migration Status
```bash
npx prisma migrate status
```

## Development Guidelines

### Shadow Database
The shadow database is used by Prisma to:
- Verify migrations before applying them
- Ensure migration reversibility
- Test database changes safely

### Best Practices
1. Always use migrations for schema changes
2. Keep migration names descriptive
3. Test migrations on shadow database first
4. Backup production database before migrations
5. Use transactions for data migrations

## Troubleshooting

### Common Issues

1. Connection Failed
```
Error: P1001: Can't reach database server
```
- Check if PostgreSQL is running
- Verify credentials in `.env`
- Ensure database exists

2. Migration Failed
```
Error: P3014: Mutation not found
```
- Reset migration history
- Check for conflicts in migration files

### Solutions

1. Reset Prisma:
```bash
npx prisma generate
npx prisma migrate reset
```

2. Verify Connection:
```bash
npx prisma db pull
```

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` to version control
   - Use strong passwords
   - Rotate credentials regularly

2. **Production Setup**
   - Use SSL/TLS for database connections
   - Implement connection pooling
   - Set up database backups

3. **Access Control**
   - Limit database user permissions
   - Use separate users for different environments
   - Regularly audit access logs
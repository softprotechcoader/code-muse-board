# Quick Setup Reference

## Database Setup

1. **Install PostgreSQL**
   - Download from: https://www.postgresql.org/download/
   - Add to system PATH

2. **Configure Environment**
   ```bash
   copy env.template .env
   ```
   Update database credentials in `.env`

3. **Create Databases**
   ```bash
   createdb codemuse
   createdb codemuse_shadow
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Run Migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

## Quick Commands

### Database
```bash
# Check database status
npx prisma db pull

# Reset database
npx prisma migrate reset

# View database GUI
npx prisma studio
```

### Development
```bash
# Start development server
npm run dev

# Validate schema
npx prisma validate

# Format schema
npx prisma format
```

## Connection Strings

### Development
```
postgresql://username:password@localhost:5432/codemuse
```

### Production Example
```
postgresql://username:password@your-host:5432/codemuse?sslmode=require
```

## Common Issues

1. **Connection Failed**
   - Check PostgreSQL service
   - Verify credentials
   - Confirm database exists

2. **Migration Failed**
   - Reset migrations
   - Check schema validity
   - Verify shadow database

## Support

For detailed information:
- [DATABASE_GUIDE.md](./DATABASE_GUIDE.md)
- [SCHEMA_GUIDE.md](./SCHEMA_GUIDE.md)
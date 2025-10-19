import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('Testing database connection...');
        const count = await prisma.news.count();
        console.log(`✅ Database connected! News count: ${count}`);
        
        if (count > 0) {
            const sample = await prisma.news.findFirst();
            console.log('Sample item:', {
                id: sample.id,
                title: sample.title?.substring(0, 50),
                timestamp: sample.timestamp
            });
        }
    } catch (error) {
        console.error('❌ Database error:', error.message);
        console.error('Check: DATABASE_URL in .env, PostgreSQL running');
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();

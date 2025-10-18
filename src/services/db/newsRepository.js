// src/services/db/newsRepository.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function saveNews(newsItem) {
    return await prisma.news.create({
        data: {
            title: newsItem.title,
            description: newsItem.description || '',
            category: newsItem.category || 'general',
            type: newsItem.type || 'update',
            source: newsItem.source,
            url: newsItem.url,
            summary: newsItem.summary
        }
    });
}

export async function getLatestNews(limit = 10) {
    return await prisma.news.findMany({
        take: limit,
        orderBy: {
            timestamp: 'desc'
        }
    });
}

export async function markNewsAsRead(newsId) {
    return await prisma.news.update({
        where: { id: newsId },
        data: { read: true }
    });
}

export async function getUnreadNewsCount() {
    return await prisma.news.count({
        where: { read: false }
    });
}

export async function getNewsByCategory(category, limit = 10) {
    return await prisma.news.findMany({
        where: { category },
        take: limit,
        orderBy: {
            timestamp: 'desc'
        }
    });
}
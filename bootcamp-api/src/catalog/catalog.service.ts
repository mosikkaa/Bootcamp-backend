import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({
      include: { topics: true },
      orderBy: { id: 'asc' },
    });
  }

  topics(query: Record<string, any> = {}) {
    const raw = query.categories ?? query['categories[]'] ?? query.category;
    const categoryIds = [raw].flat().filter(Boolean).map(Number).filter(n => !isNaN(n));
    return this.prisma.topic.findMany({
      where: categoryIds.length ? { categoryId: { in: categoryIds } } : undefined,
      orderBy: { id: 'asc' },
    });
  }

  instructors() {
    return this.prisma.instructor.findMany({ orderBy: { id: 'asc' } });
  }
}

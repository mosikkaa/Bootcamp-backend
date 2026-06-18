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

  topics() {
    return this.prisma.topic.findMany({ orderBy: { id: 'asc' } });
  }

  instructors() {
    return this.prisma.instructor.findMany({ orderBy: { id: 'asc' } });
  }
}

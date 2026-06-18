import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WEEKLY_SCHEDULE_MAP, TIME_SLOT_MAP } from '../common/lookup-maps';
import { CreateReviewDto } from './dto/create-review.dto';

function serializeSchedule(s: any) {
  const weekly = WEEKLY_SCHEDULE_MAP[s.weeklyScheduleId];
  const slot = TIME_SLOT_MAP[s.timeSlotId];
  return {
    id: s.id,
    courseId: s.courseId,
    sessionType: s.sessionType,
    weeklySchedule: weekly,
    timeSlot: slot,
    priceModifier: Number(s.priceModifier),
    totalSeats: s.totalSeats,
    location: s.location,
  };
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { categoryId?: any; instructorId?: any; search?: string; page?: any; limit?: any }) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '12', 10)));
    const where: any = {};
    if (query.categoryId) where.categoryId = Number(query.categoryId);
    if (query.instructorId) where.instructorId = Number(query.instructorId);
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

    const [total, items] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: { category: true, instructor: true },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map(c => ({ ...c, basePrice: Number(c.basePrice) })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async featured() {
    const courses = await this.prisma.course.findMany({
      where: { isFeatured: true },
      include: { category: true, instructor: true },
      orderBy: { createdAt: 'desc' },
    });
    return courses.map(c => ({ ...c, basePrice: Number(c.basePrice) }));
  }

  async findOne(id: number, userId?: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        category: { include: { topics: true } },
        instructor: true,
        schedules: true,
        reviews: { include: { user: { select: { username: true, avatar: true } } } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    let userEnrollment: any = null;
    if (userId) {
      userEnrollment = await this.prisma.enrollment.findFirst({
        where: { userId, courseId: id },
        include: { schedule: true },
      });
    }

    const avgRating = course.reviews.length
      ? course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length
      : null;

    return {
      ...course,
      basePrice: Number(course.basePrice),
      schedules: course.schedules.map(serializeSchedule),
      reviews: course.reviews.map(r => ({ id: r.id, rating: r.rating, user: r.user })),
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewCount: course.reviews.length,
      userEnrollment: userEnrollment
        ? { id: userEnrollment.id, progress: userEnrollment.progress, completedAt: userEnrollment.completedAt }
        : null,
    };
  }

  async schedules(courseId: number) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const schedules = await this.prisma.courseSchedule.findMany({
      where: { courseId },
      orderBy: [{ weeklyScheduleId: 'asc' }, { timeSlotId: 'asc' }],
    });
    return schedules.map(serializeSchedule);
  }

  async createReview(courseId: number, userId: number, dto: CreateReviewDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const enrolled = await this.prisma.enrollment.findFirst({
      where: { userId, courseId },
    });
    if (!enrolled) throw new BadRequestException('You must be enrolled to review this course');

    try {
      return await this.prisma.review.create({
        data: { userId, courseId, rating: dto.rating },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('You have already reviewed this course');
      throw e;
    }
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async list(query: Record<string, any>) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '9', 10)));

    const toIds = (val: any): number[] =>
      [val].flat().filter(Boolean).map(Number).filter(n => !isNaN(n));

    const categoryIds = toIds(query['categories[]'] ?? query.categories ?? query.category);
    const topicIds = toIds(query['topics[]'] ?? query.topics ?? query.topic);
    const instructorIds = toIds(query['instructors[]'] ?? query.instructors ?? query.instructor);

    let effectiveCategoryIds: number[] = [...categoryIds];
    if (topicIds.length) {
      const topics = await this.prisma.topic.findMany({
        where: { id: { in: topicIds } },
        select: { categoryId: true },
      });
      const topicCatIds = topics.map(t => t.categoryId);
      effectiveCategoryIds = [...new Set([...effectiveCategoryIds, ...topicCatIds])];
    }

    const where: any = {};
    if (effectiveCategoryIds.length) where.categoryId = { in: effectiveCategoryIds };
    if (instructorIds.length) where.instructorId = { in: instructorIds };
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

    let orderBy: any = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
    if (query.sort === 'price_asc') orderBy = [{ basePrice: 'asc' }];
    else if (query.sort === 'price_desc') orderBy = [{ basePrice: 'desc' }];
    else if (query.sort === 'rating') orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];

    const [total, items] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: {
          category: true,
          instructor: true,
          _count: { select: { reviews: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const courseIds = items.map(c => c.id);
    const avgRatings = await this.prisma.review.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds } },
      _avg: { rating: true },
    });
    const ratingMap = new Map(avgRatings.map(r => [r.courseId, r._avg.rating]));

    const data = items.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      image: c.image,
      basePrice: Number(c.basePrice),
      durationWeeks: c.durationWeeks,
      hours: c.hours,
      isFeatured: c.isFeatured,
      categoryId: c.categoryId,
      instructorId: c.instructorId,
      createdAt: c.createdAt,
      category: c.category,
      instructor: c.instructor,
      reviewCount: c._count.reviews,
      avgRating: ratingMap.get(c.id) ?? null,
    }));

    return {
      data,
      meta: {
        currentPage: page,
        lastPage: Math.ceil(total / limit),
        total,
      },
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
    let isRated = false;
    if (userId) {
      userEnrollment = await this.prisma.enrollment.findFirst({
        where: { userId, courseId: id },
        include: { schedule: true },
      });
      isRated = course.reviews.some(r => r.userId === userId);
    }

    const avgRating = course.reviews.length
      ? course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length
      : null;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      image: course.image,
      basePrice: Number(course.basePrice),
      durationWeeks: course.durationWeeks,
      hours: course.hours,
      isFeatured: course.isFeatured,
      categoryId: course.categoryId,
      instructorId: course.instructorId,
      createdAt: course.createdAt,
      category: course.category,
      instructor: course.instructor,
      schedules: course.schedules.map(serializeSchedule),
      reviews: course.reviews.map(r => ({ id: r.id, rating: r.rating, user: r.user })),
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewCount: course.reviews.length,
      isRated,
      enrollment: userEnrollment
        ? {
            id: userEnrollment.id,
            progress: userEnrollment.progress,
            completedAt: userEnrollment.completedAt,
            schedule: userEnrollment.schedule
              ? {
                  weeklySchedule: WEEKLY_SCHEDULE_MAP[userEnrollment.schedule.weeklyScheduleId]
                    ? { label: WEEKLY_SCHEDULE_MAP[userEnrollment.schedule.weeklyScheduleId].label }
                    : null,
                  timeSlot: TIME_SLOT_MAP[userEnrollment.schedule.timeSlotId]
                    ? { label: TIME_SLOT_MAP[userEnrollment.schedule.timeSlotId].label }
                    : null,
                  sessionType: { name: userEnrollment.schedule.sessionType },
                  location: userEnrollment.schedule.location,
                }
              : null,
          }
        : null,
    };
  }

  async weeklySchedules(courseId: number) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const schedules = await this.prisma.courseSchedule.findMany({
      where: { courseId },
      select: { weeklyScheduleId: true },
      distinct: ['weeklyScheduleId'],
      orderBy: { weeklyScheduleId: 'asc' },
    });
    return schedules.map(s => ({ id: s.weeklyScheduleId, ...WEEKLY_SCHEDULE_MAP[s.weeklyScheduleId] }));
  }

  async timeSlots(courseId: number, weeklyScheduleId: number) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const schedules = await this.prisma.courseSchedule.findMany({
      where: { courseId, weeklyScheduleId },
      select: { timeSlotId: true },
      distinct: ['timeSlotId'],
      orderBy: { timeSlotId: 'asc' },
    });
    return schedules.map(s => ({
      id: s.timeSlotId,
      startTime: TIME_SLOT_MAP[s.timeSlotId].startTime,
      endTime: TIME_SLOT_MAP[s.timeSlotId].endTime,
      label: TIME_SLOT_MAP[s.timeSlotId].label,
    }));
  }

  async sessionTypes(courseId: number, weeklyScheduleId: number, timeSlotId: number) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const schedules = await this.prisma.courseSchedule.findMany({
      where: { courseId, weeklyScheduleId, timeSlotId },
      include: { _count: { select: { enrollments: true } } },
    });

    return schedules.map(s => ({
      courseScheduleId: s.id,
      name: s.sessionType,
      priceModifier: Number(s.priceModifier),
      availableSeats: Math.max(0, s.totalSeats - s._count.enrollments),
      location: s.location,
    }));
  }

  async createReview(courseId: number, userId: number, dto: CreateReviewDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const enrolled = await this.prisma.enrollment.findFirst({
      where: { userId, courseId },
    });
    if (!enrolled) throw new BadRequestException('You must be enrolled to review this course');

    await this.prisma.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, rating: dto.rating },
      update: { rating: dto.rating },
    });
    return { message: 'Review submitted' };
  }
}

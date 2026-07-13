import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

function toCourseResponse(c: any, avgRating: number | null) {
  return {
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
    avgRating,
  };
}

const courseInclude = {
  category: true,
  instructor: true,
  _count: { select: { reviews: true } },
} as const;

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

    const where: any = {};
    if (categoryIds.length) where.categoryId = { in: categoryIds };
    if (topicIds.length) where.topicId = { in: topicIds };
    if (instructorIds.length) where.instructorId = { in: instructorIds };
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

    if (query.sort === 'rating') {
      const [all, ratings] = await Promise.all([
        this.prisma.course.findMany({ where, include: courseInclude }),
        this.prisma.review.groupBy({
          by: ['courseId'],
          where: { course: where },
          _avg: { rating: true },
        }),
      ]);
      const ratingMap = new Map(ratings.map(r => [r.courseId, r._avg.rating ?? 0]));
      all.sort((a, b) => (ratingMap.get(b.id) ?? 0) - (ratingMap.get(a.id) ?? 0));
      const total = all.length;
      const items = all.slice((page - 1) * limit, page * limit);
      return {
        data: items.map(c => toCourseResponse(c, ratingMap.get(c.id) ?? null)),
        meta: { currentPage: page, lastPage: Math.ceil(total / limit), total },
      };
    }

    let orderBy: any = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
    if (query.sort === 'price_asc') orderBy = [{ basePrice: 'asc' }];
    else if (query.sort === 'price_desc') orderBy = [{ basePrice: 'desc' }];

    const [total, items, ratings] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: courseInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.groupBy({
        by: ['courseId'],
        where: { course: where },
        _avg: { rating: true },
      }),
    ]);

    const ratingMap = new Map(ratings.map(r => [r.courseId, r._avg.rating ?? null]));

    return {
      data: items.map(c => toCourseResponse(c, ratingMap.get(c.id) ?? null)),
      meta: { currentPage: page, lastPage: Math.ceil(total / limit), total },
    };
  }

  async featured() {
    const [courses, ratings] = await Promise.all([
      this.prisma.course.findMany({
        where: { isFeatured: true },
        include: courseInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.groupBy({
        by: ['courseId'],
        where: { course: { isFeatured: true } },
        _avg: { rating: true },
      }),
    ]);
    const ratingMap = new Map(ratings.map(r => [r.courseId, r._avg.rating ?? null]));
    return courses.map(c => toCourseResponse(c, ratingMap.get(c.id) ?? null));
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
    const schedules = await this.prisma.courseSchedule.findMany({
      where: { courseId },
      select: { weeklyScheduleId: true },
      distinct: ['weeklyScheduleId'],
      orderBy: { weeklyScheduleId: 'asc' },
    });
    return schedules.map(s => ({ id: s.weeklyScheduleId, ...WEEKLY_SCHEDULE_MAP[s.weeklyScheduleId] }));
  }

  async timeSlots(courseId: number, weeklyScheduleId: number) {
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

    const enrolled = await this.prisma.enrollment.findFirst({ where: { userId, courseId } });
    if (!enrolled) throw new BadRequestException('You must be enrolled to review this course');

    await this.prisma.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, rating: dto.rating },
      update: { rating: dto.rating },
    });
    return { message: 'Review submitted' };
  }
}

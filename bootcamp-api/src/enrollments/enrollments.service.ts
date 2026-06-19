import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WEEKLY_SCHEDULE_MAP, TIME_SLOT_MAP } from '../common/lookup-maps';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

function serializeEnrollment(enrollment: any, course: any) {
  const schedule = enrollment.schedule;
  const weekly = WEEKLY_SCHEDULE_MAP[schedule.weeklyScheduleId];
  const slot = TIME_SLOT_MAP[schedule.timeSlotId];

  return {
    id: enrollment.id,
    progress: enrollment.progress,
    completedAt: enrollment.completedAt,
    createdAt: enrollment.createdAt,
    course: course
      ? {
          id: course.id,
          title: course.title,
          image: course.image,
          avgRating: course.avgRating ?? null,
          instructor: course.instructor ? { name: course.instructor.name } : null,
        }
      : null,
    schedule: {
      weeklySchedule: weekly ? { label: weekly.label } : null,
      timeSlot: slot ? { label: slot.label } : null,
      sessionType: { name: schedule.sessionType },
      location: schedule.location,
    },
  };
}

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateEnrollmentDto, force = false) {
    const schedule = await this.prisma.courseSchedule.findUnique({
      where: { id: dto.courseScheduleId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!schedule || schedule.courseId !== dto.courseId) {
      throw new NotFoundException('Schedule not found for this course');
    }

    const availableSeats = schedule.totalSeats - schedule._count.enrollments;
    if (availableSeats <= 0) {
      throw new BadRequestException('No seats available');
    }

    const alreadyEnrolled = await this.prisma.enrollment.findFirst({
      where: { userId, courseId: dto.courseId },
    });
    if (alreadyEnrolled) {
      throw new ConflictException('Already enrolled in this course');
    }

    if (!force) {
      const conflictingEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId,
          schedule: {
            weeklyScheduleId: schedule.weeklyScheduleId,
            timeSlotId: schedule.timeSlotId,
          },
        },
      });
      if (conflictingEnrollment) {
        const weekly = WEEKLY_SCHEDULE_MAP[schedule.weeklyScheduleId];
        const slot = TIME_SLOT_MAP[schedule.timeSlotId];
        const conflictingCourse = await this.prisma.course.findUnique({
          where: { id: conflictingEnrollment.courseId },
          select: { title: true },
        });
        throw new ConflictException({
          message: 'Schedule conflict',
          conflicts: [{
            conflictingCourseName: conflictingCourse?.title ?? 'Another course',
            schedule: `${weekly?.label ?? ''} at ${slot?.label ?? ''}`,
          }],
        });
      }
    }

    const enrollment = await this.prisma.enrollment.create({
      data: { userId, courseId: dto.courseId, courseScheduleId: dto.courseScheduleId },
      include: { schedule: true },
    });

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      include: { instructor: true },
    });

    return serializeEnrollment(enrollment, course);
  }

  async findAllForUser(userId: number) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: { schedule: true },
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = [...new Set(enrollments.map(e => e.courseId))];
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      include: { instructor: true },
    });

    const avgRatings = await this.prisma.review.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds } },
      _avg: { rating: true },
    });
    const ratingMap = new Map(avgRatings.map(r => [r.courseId, r._avg.rating]));
    const courseMap = new Map(courses.map(c => [c.id, { ...c, avgRating: ratingMap.get(c.id) ?? null }]));

    return enrollments.map(e => serializeEnrollment(e, courseMap.get(e.courseId)));
  }

  async complete(enrollmentId: number, userId: number) {
    const existing = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!existing) throw new NotFoundException('Enrollment not found');
    if (existing.userId !== userId) throw new ForbiddenException();

    const enrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { progress: 100, completedAt: new Date() },
      include: { schedule: true },
    });

    const course = await this.prisma.course.findUnique({
      where: { id: enrollment.courseId },
      include: { instructor: true },
    });

    return serializeEnrollment(enrollment, course);
  }

  async remove(enrollmentId: number, userId: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.userId !== userId) throw new ForbiddenException();

    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { message: 'Enrollment deleted' };
  }
}

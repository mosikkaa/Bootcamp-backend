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
    const [schedule, alreadyEnrolled] = await Promise.all([
      this.prisma.courseSchedule.findUnique({
        where: { id: dto.courseScheduleId },
        include: { _count: { select: { enrollments: true } } },
      }),
      this.prisma.enrollment.findFirst({
        where: { userId, courseId: dto.courseId },
      }),
    ]);

    if (!schedule || schedule.courseId !== dto.courseId) {
      throw new NotFoundException('Schedule not found for this course');
    }
    if (schedule.totalSeats - schedule._count.enrollments <= 0) {
      throw new BadRequestException('No seats available');
    }
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
      include: {
        schedule: true,
        course: { include: { instructor: true } },
      },
    });

    return serializeEnrollment(enrollment, enrollment.course);
  }

  async findAllForUser(userId: number) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: { schedule: true },
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = [...new Set(enrollments.map(e => e.courseId))];

    const [courses, avgRatings] = await Promise.all([
      this.prisma.course.findMany({
        where: { id: { in: courseIds } },
        include: { instructor: true },
      }),
      this.prisma.review.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _avg: { rating: true },
      }),
    ]);

    const ratingMap = new Map(avgRatings.map(r => [r.courseId, r._avg.rating]));
    const courseMap = new Map(courses.map(c => [c.id, { ...c, avgRating: ratingMap.get(c.id) ?? null }]));

    return enrollments.map(e => serializeEnrollment(e, courseMap.get(e.courseId)));
  }

  async complete(enrollmentId: number, userId: number) {
    let enrollment: any;
    try {
      enrollment = await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { progress: 100, completedAt: new Date() },
        include: {
          schedule: true,
          course: { include: { instructor: true } },
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException('Enrollment not found');
      throw e;
    }
    if (enrollment.userId !== userId) throw new ForbiddenException();
    return serializeEnrollment(enrollment, enrollment.course);
  }

  async remove(enrollmentId: number, userId: number) {
    const { count } = await this.prisma.enrollment.deleteMany({
      where: { id: enrollmentId, userId },
    });
    if (count === 0) {
      const exists = await this.prisma.enrollment.count({ where: { id: enrollmentId } });
      throw exists ? new ForbiddenException() : new NotFoundException('Enrollment not found');
    }
    return { message: 'Enrollment deleted' };
  }
}

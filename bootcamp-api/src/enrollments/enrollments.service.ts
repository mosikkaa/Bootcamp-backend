import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateEnrollmentDto) {
    const schedule = await this.prisma.courseSchedule.findUnique({
      where: { id: dto.courseScheduleId },
    });
    if (!schedule || schedule.courseId !== dto.courseId) {
      throw new NotFoundException('Schedule not found for this course');
    }

    const alreadyEnrolled = await this.prisma.enrollment.findFirst({
      where: { userId, courseId: dto.courseId },
    });
    if (alreadyEnrolled) {
      throw new ConflictException('Already enrolled in this course');
    }

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
      throw new ConflictException('Schedule conflicts with an existing enrollment');
    }

    return this.prisma.enrollment.create({
      data: {
        userId,
        courseId: dto.courseId,
        courseScheduleId: dto.courseScheduleId,
      },
      include: { schedule: true },
    });
  }

  async findAllForUser(userId: number) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        schedule: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
      include: { category: true, instructor: true },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    return enrollments.map((e) => ({
      ...e,
      course: courseMap.get(e.courseId),
    }));
  }

  async complete(enrollmentId: number, userId: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.userId !== userId) throw new ForbiddenException();

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { progress: 100, completedAt: new Date() },
    });
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

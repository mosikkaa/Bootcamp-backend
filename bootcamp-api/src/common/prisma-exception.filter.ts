import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientUnknownRequestError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    ex:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientUnknownRequestError,
    host: ArgumentsHost,
  ) {
    const res = host.switchToHttp().getResponse();
    if (ex instanceof Prisma.PrismaClientValidationError) {
      return res.status(HttpStatus.BAD_REQUEST).json({ statusCode: 400, message: 'Invalid request data' });
    }

    if (ex instanceof Prisma.PrismaClientInitializationError || ex instanceof Prisma.PrismaClientUnknownRequestError) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ statusCode: 503, message: 'Database unavailable, please retry' });
    }

    switch ((ex as Prisma.PrismaClientKnownRequestError).code) {
      case 'P2002':
        return res.status(HttpStatus.CONFLICT).json({ statusCode: 409, message: 'Resource already exists' });
      case 'P2025':
        return res.status(HttpStatus.NOT_FOUND).json({ statusCode: 404, message: 'Record not found' });
      case 'P2003':
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({ statusCode: 422, message: 'Referenced record does not exist' });
      default:
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: 500,
          message: 'Database error',
          code: (ex as any).code,
        });
    }
  }
}

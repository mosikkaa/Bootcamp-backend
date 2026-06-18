import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(ex: BadRequestException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const r = ex.getResponse() as any;

    if (r?.errors) {
      return res.status(422).json(r);
    }

    const errors: Record<string, string[]> = {};
    if (Array.isArray(r?.message)) {
      for (const m of r.message) {
        const field = m.split(' ')[0];
        (errors[field] ||= []).push(m);
      }
    }
    res.status(422).json({ errors, message: 'Validation failed' });
  }
}

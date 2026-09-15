import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface RequestLike {
  method: string;
  originalUrl: string;
  ip?: string;
}

interface ResponseLike {
  statusCode: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestLike>();
    const res = context.switchToHttp().getResponse<ResponseLike>();
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.log(req, res.statusCode, startedAt),
        error: (err: { status?: number }) =>
          this.log(req, err.status ?? 500, startedAt),
      }),
    );
  }

  private log(req: RequestLike, status: number, startedAt: bigint) {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    this.logger.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        status,
        durationMs: Math.round(durationMs * 10) / 10,
        ip: req.ip ?? '',
      }),
    );
  }
}
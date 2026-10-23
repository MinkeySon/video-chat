import { ValidationError, ValidationPipe } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { CallErrorCode } from '../exception/call.exception';

/** 이벤트 payload를 DTO로 변환·검증하고, 실패 시 `exception` 이벤트로 돌려준다. */
export class WsValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new WsException({
          status: 'error',
          code: CallErrorCode.INVALID_PAYLOAD,
          message: WsValidationPipe.flatten(errors),
        }),
    });
  }

  /** 중첩 DTO 오류까지 `필드: 메시지` 목록으로 편다. */
  private static flatten(errors: ValidationError[], parent = ''): string[] {
    return errors.flatMap((error) => {
      const path = parent ? `${parent}.${error.property}` : error.property;
      const own = Object.values(error.constraints ?? {}).map(
        (message) => `${path}: ${message}`,
      );
      return [...own, ...WsValidationPipe.flatten(error.children ?? [], path)];
    });
  }
}

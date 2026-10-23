import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { CallException } from './call.exception';

/** CallException을 클라이언트 `exception` 이벤트 `{ status, code, message, event }`로 변환한다. */
@Catch(CallException)
export class CallWsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: CallException, host: ArgumentsHost): void {
    super.catch(
      new WsException({
        status: 'error',
        code: exception.code,
        message: exception.message,
        event: host.switchToWs().getPattern(),
      }),
      host,
    );
  }
}

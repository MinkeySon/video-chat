import { Controller, Get } from '@nestjs/common';
import { CallService } from './call.service';
import { ResIceServersDto } from './dto/res/res-ice-servers.dto';

@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}

  /** 클라이언트가 RTCPeerConnection 생성 전 조회하는 STUN/TURN 목록 */
  @Get('ice-servers')
  getIceServers(): ResIceServersDto {
    return this.callService.getIceServers();
  }
}

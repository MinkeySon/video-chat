import { ReqRelaySdpDto } from '../req/req-relay-sdp.dto';
import { ReqSessionDescriptionDto } from '../req/req-session-description.dto';

/** signal:offer / signal:answer — 상대에게 중계하는 SDP */
export class ResRelaySdpDto {
  roomCode: string;
  fromId: string;
  sdp: ReqSessionDescriptionDto;

  static from(req: ReqRelaySdpDto, fromId: string): ResRelaySdpDto {
    const dto = new ResRelaySdpDto();
    dto.roomCode = req.roomCode;
    dto.fromId = fromId;
    dto.sdp = req.sdp;
    return dto;
  }
}

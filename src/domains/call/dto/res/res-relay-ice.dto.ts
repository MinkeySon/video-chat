import { ReqIceCandidateDto } from '../req/req-ice-candidate.dto';
import { ReqRelayIceDto } from '../req/req-relay-ice.dto';

/** signal:ice — 상대에게 중계하는 ICE candidate */
export class ResRelayIceDto {
  roomCode: string;
  fromId: string;
  candidate: ReqIceCandidateDto;

  static from(req: ReqRelayIceDto, fromId: string): ResRelayIceDto {
    const dto = new ResRelayIceDto();
    dto.roomCode = req.roomCode;
    dto.fromId = fromId;
    dto.candidate = req.candidate;
    return dto;
  }
}

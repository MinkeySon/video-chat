import { CallRoom } from '../../entity/call-room.entity';

/** room:peer-joined / room:peer-left — 상대에게 보내는 알림 */
export class ResPeerEventDto {
  roomCode: string;
  peerId: string;

  static from(room: CallRoom, peerId: string): ResPeerEventDto {
    const dto = new ResPeerEventDto();
    dto.roomCode = room.roomCode;
    dto.peerId = peerId;
    return dto;
  }
}

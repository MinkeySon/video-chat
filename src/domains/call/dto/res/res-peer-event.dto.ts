import { CallRoom } from '../../entity/call-room.entity';

/** room:peer-joined / room:peer-left — 상대에게 보내는 알림 */
export class ResPeerEventDto {
  roomCode: string;
  peerId: string;

  /** room: 방 Entity 또는 roomCode를 가진 응답(ResRoomJoinedDto) */
  static from(
    room: Pick<CallRoom, 'roomCode'>,
    peerId: string,
  ): ResPeerEventDto {
    const dto = new ResPeerEventDto();
    dto.roomCode = room.roomCode;
    dto.peerId = peerId;
    return dto;
  }
}

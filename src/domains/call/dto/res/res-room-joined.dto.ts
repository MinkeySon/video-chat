import { CallRoom } from '../../entity/call-room.entity';

/** room:joined — 입장한 본인에게 보내는 응답 */
export class ResRoomJoinedDto {
  roomId: string;
  roomCode: string;
  peerCount: number;
  /** true면 먼저 입장한 쪽. 상대 입장 시 offer를 만든다. */
  isInitiator: boolean;

  static from(room: CallRoom, peerCount: number): ResRoomJoinedDto {
    const dto = new ResRoomJoinedDto();
    dto.roomId = room.id;
    dto.roomCode = room.roomCode;
    dto.peerCount = peerCount;
    dto.isInitiator = peerCount === 1;
    return dto;
  }
}

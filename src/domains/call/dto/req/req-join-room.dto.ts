import { CallRoom } from '../../entity/call-room.entity';
import { ReqRoomCodeDto } from './req-room-code.dto';

export class ReqJoinRoomDto extends ReqRoomCodeDto {
  toEntity(): CallRoom {
    return CallRoom.create(this.roomCode);
  }
}

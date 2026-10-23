import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { ReqRoomCodeDto } from './req-room-code.dto';
import { ReqSessionDescriptionDto } from './req-session-description.dto';

export class ReqRelaySdpDto extends ReqRoomCodeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ReqSessionDescriptionDto)
  sdp: ReqSessionDescriptionDto;
}

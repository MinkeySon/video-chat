import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { ReqIceCandidateDto } from './req-ice-candidate.dto';
import { ReqRoomCodeDto } from './req-room-code.dto';

export class ReqRelayIceDto extends ReqRoomCodeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ReqIceCandidateDto)
  candidate: ReqIceCandidateDto;
}

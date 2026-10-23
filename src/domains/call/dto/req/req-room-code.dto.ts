import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/** 방 코드를 담는 요청 DTO 공통 부모 */
export abstract class ReqRoomCodeDto {
  static readonly ROOM_CODE_MAX_LENGTH = 64;

  @IsString()
  @IsNotEmpty()
  @MaxLength(ReqRoomCodeDto.ROOM_CODE_MAX_LENGTH)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'roomCode는 영문·숫자·_·- 만 사용할 수 있습니다.',
  })
  roomCode: string;
}

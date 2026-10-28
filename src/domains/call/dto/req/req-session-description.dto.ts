import { IsIn, IsString } from 'class-validator';

/** WebRTC RTCSessionDescriptionInit (중계 대상 SDP) */
export class ReqSessionDescriptionDto {
  static readonly TYPES = ['offer', 'answer'] as const;

  @IsIn(ReqSessionDescriptionDto.TYPES)
  type: (typeof ReqSessionDescriptionDto.TYPES)[number];

  @IsString()
  sdp: string;
}

import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/** WebRTC RTCIceCandidateInit. candidate가 빈 문자열이면 end-of-candidates */
export class ReqIceCandidateDto {
  @IsString()
  candidate: string;

  @IsOptional()
  @IsString()
  sdpMid?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sdpMLineIndex?: number | null;

  @IsOptional()
  @IsString()
  usernameFragment?: string | null;
}

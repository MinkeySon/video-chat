import { ResIceServerDto } from './res-ice-server.dto';

/** GET /call/ice-servers — RTCPeerConnection({ iceServers }) 에 그대로 넣는 값 */
export class ResIceServersDto {
  iceServers: ResIceServerDto[];

  static from(iceServers: ResIceServerDto[]): ResIceServersDto {
    const dto = new ResIceServersDto();
    dto.iceServers = iceServers;
    return dto;
  }
}

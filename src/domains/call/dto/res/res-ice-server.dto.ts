/** WebRTC RTCIceServer 한 건 (STUN 또는 TURN) */
export class ResIceServerDto {
  urls: string[];
  username?: string;
  credential?: string;

  static stun(urls: string[]): ResIceServerDto {
    const dto = new ResIceServerDto();
    dto.urls = urls;
    return dto;
  }

  static turn(
    url: string,
    username: string,
    credential: string,
  ): ResIceServerDto {
    const dto = new ResIceServerDto();
    dto.urls = [url];
    dto.username = username;
    dto.credential = credential;
    return dto;
  }
}

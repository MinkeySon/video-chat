export enum CallErrorCode {
  ROOM_FULL = 'ROOM_FULL',
  NOT_IN_ROOM = 'NOT_IN_ROOM',
  PEER_NOT_FOUND = 'PEER_NOT_FOUND',
}

/** 통화 도메인 예외. 전송 계층(WS/HTTP)과 무관하며 게이트웨이에서 변환한다. */
export class CallException extends Error {
  private constructor(
    readonly code: CallErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CallException';
  }

  static roomFull(roomCode: string): CallException {
    return new CallException(
      CallErrorCode.ROOM_FULL,
      `방(${roomCode})의 정원이 가득 찼습니다.`,
    );
  }

  static notInRoom(roomCode: string): CallException {
    return new CallException(
      CallErrorCode.NOT_IN_ROOM,
      `방(${roomCode})에 입장하지 않았습니다.`,
    );
  }

  static peerNotFound(roomCode: string): CallException {
    return new CallException(
      CallErrorCode.PEER_NOT_FOUND,
      `방(${roomCode})에 상대가 없습니다.`,
    );
  }
}

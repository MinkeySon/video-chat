/** 시그널링 socket.io 이벤트 이름 (웹·앱 클라이언트 공통 규약) */
export const CALL_EVENTS = {
  JOIN: 'room:join',
  JOINED: 'room:joined',
  LEAVE: 'room:leave',
  PEER_JOINED: 'room:peer-joined',
  PEER_LEFT: 'room:peer-left',
  OFFER: 'signal:offer',
  ANSWER: 'signal:answer',
  ICE: 'signal:ice',
} as const;

export type CallSdpEvent = typeof CALL_EVENTS.OFFER | typeof CALL_EVENTS.ANSWER;

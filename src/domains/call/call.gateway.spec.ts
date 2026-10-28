import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { CALL_EVENTS } from './call.constants';
import { CallErrorCode } from './exception/call.exception';

/**
 * 실제 앱 + socket.io 클라이언트로 시그널링 흐름을 검증한다.
 * DB는 개발 DB와 분리된 video-chat-test를 쓰고, 시작 시 마이그레이션 후 테이블을 비운다.
 */
const TEST_DATABASE = 'video-chat-test';
const ROOM_CODE = 'gateway-spec';

describe('CallGateway (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let url: string;
  const clients: ClientSocket[] = [];

  const connect = async (): Promise<ClientSocket> => {
    const socket = io(url, { transports: ['websocket'], forceNew: true });
    clients.push(socket);
    await nextEvent(socket, 'connect');
    return socket;
  };

  const nextEvent = <T = unknown>(
    socket: ClientSocket,
    event: string,
    timeoutMs = 2000,
  ): Promise<T> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${event} 이벤트 대기 시간 초과`)),
        timeoutMs,
      );
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

  const join = async (socket: ClientSocket) => {
    const joined = nextEvent<{ peerCount: number; isInitiator: boolean }>(
      socket,
      CALL_EVENTS.JOINED,
    );
    socket.emit(CALL_EVENTS.JOIN, { roomCode: ROOM_CODE });
    return joined;
  };

  const roomRow = async () => {
    const rows: { status: string; started: boolean; ended: boolean }[] =
      await dataSource.query(
        `SELECT status, started_at IS NOT NULL AS started, ended_at IS NOT NULL AS ended
           FROM call_room WHERE room_code = $1 ORDER BY created_at DESC LIMIT 1`,
        [ROOM_CODE],
      );
    return rows[0];
  };

  beforeAll(async () => {
    process.env.DB_DATABASE = TEST_DATABASE;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    dataSource = app.get(DataSource);

    if (dataSource.options.database !== TEST_DATABASE) {
      throw new Error(
        `테스트 DB가 아닙니다: ${String(dataSource.options.database)}`,
      );
    }
    await dataSource.runMigrations();
    await dataSource.query('TRUNCATE call_participant, call_room');

    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    url = `http://localhost:${port}`;
  });

  // 서버의 disconnect 처리(leaveAll)가 DB에 반영될 때까지 기다려야 다음 테스트·app.close와 겹치지 않는다.
  afterEach(async () => {
    clients.splice(0).forEach((socket) => socket.disconnect());
    for (let i = 0; i < 40; i++) {
      const rows: { active: number }[] = await dataSource.query(
        'SELECT count(*)::int AS active FROM call_participant WHERE left_at IS NULL',
      );
      if (rows[0].active === 0) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('disconnect 처리 대기 시간 초과');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('두 명 입장 → offer/answer/ice 중계 → 연결 끊김 시 peer-left', async () => {
    const a = await connect();
    const b = await connect();

    await expect(join(a)).resolves.toMatchObject({
      peerCount: 1,
      isInitiator: true,
    });

    const peerJoined = nextEvent(a, CALL_EVENTS.PEER_JOINED);
    await expect(join(b)).resolves.toMatchObject({
      peerCount: 2,
      isInitiator: false,
    });
    await expect(peerJoined).resolves.toEqual({
      roomCode: ROOM_CODE,
      peerId: b.id,
    });
    await expect(roomRow()).resolves.toMatchObject({
      status: 'ACTIVE',
      started: true,
    });

    const offer = nextEvent(b, CALL_EVENTS.OFFER);
    a.emit(CALL_EVENTS.OFFER, {
      roomCode: ROOM_CODE,
      sdp: { type: 'offer', sdp: 'v=0 offer' },
    });
    await expect(offer).resolves.toEqual({
      roomCode: ROOM_CODE,
      fromId: a.id,
      sdp: { type: 'offer', sdp: 'v=0 offer' },
    });

    const answer = nextEvent(a, CALL_EVENTS.ANSWER);
    b.emit(CALL_EVENTS.ANSWER, {
      roomCode: ROOM_CODE,
      sdp: { type: 'answer', sdp: 'v=0 answer' },
    });
    await expect(answer).resolves.toMatchObject({ fromId: b.id });

    const candidate = {
      candidate: 'candidate:1',
      sdpMid: '0',
      sdpMLineIndex: 0,
    };
    const ice = nextEvent(b, CALL_EVENTS.ICE);
    a.emit(CALL_EVENTS.ICE, { roomCode: ROOM_CODE, candidate });
    await expect(ice).resolves.toEqual({
      roomCode: ROOM_CODE,
      fromId: a.id,
      candidate,
    });

    const peerLeft = nextEvent(a, CALL_EVENTS.PEER_LEFT);
    const bId = b.id;
    b.disconnect();
    await expect(peerLeft).resolves.toEqual({
      roomCode: ROOM_CODE,
      peerId: bId,
    });
    await expect(roomRow()).resolves.toMatchObject({ status: 'WAITING' });

    const leftRows: { left: number }[] = await dataSource.query(
      'SELECT count(*)::int AS left FROM call_participant WHERE socket_id = $1 AND left_at IS NOT NULL',
      [bId],
    );
    expect(leftRows[0].left).toBe(1);

    a.emit(CALL_EVENTS.LEAVE, { roomCode: ROOM_CODE });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await expect(roomRow()).resolves.toMatchObject({
      status: 'ENDED',
      ended: true,
    });
  });

  it('정원 초과·미입장 중계·잘못된 payload는 exception 이벤트', async () => {
    const [a, b, c] = [await connect(), await connect(), await connect()];
    await join(a);
    await join(b);

    const full = nextEvent(c, 'exception');
    c.emit(CALL_EVENTS.JOIN, { roomCode: ROOM_CODE });
    await expect(full).resolves.toMatchObject({
      code: CallErrorCode.ROOM_FULL,
      event: CALL_EVENTS.JOIN,
    });

    const notInRoom = nextEvent(c, 'exception');
    c.emit(CALL_EVENTS.OFFER, {
      roomCode: ROOM_CODE,
      sdp: { type: 'offer', sdp: 'x' },
    });
    await expect(notInRoom).resolves.toMatchObject({
      code: CallErrorCode.NOT_IN_ROOM,
    });

    const invalid = nextEvent<{ code: string; message: string[] }>(
      c,
      'exception',
    );
    c.emit(CALL_EVENTS.JOIN, { roomCode: '방 1', extra: true });
    const invalidPayload = await invalid;
    expect(invalidPayload.code).toBe(CallErrorCode.INVALID_PAYLOAD);
    expect(invalidPayload.message).toHaveLength(2);
  });

  it('GET /call/ice-servers', async () => {
    const response = await fetch(`${url}/call/ice-servers`);
    const body = (await response.json()) as {
      iceServers: { urls: string[] }[];
    };

    expect(response.status).toBe(200);
    expect(body.iceServers[0].urls[0]).toMatch(/^stun:/);
  });
});

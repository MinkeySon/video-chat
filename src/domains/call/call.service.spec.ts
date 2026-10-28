import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { CallService } from './call.service';
import { ReqJoinRoomDto } from './dto/req/req-join-room.dto';
import { ReqLeaveRoomDto } from './dto/req/req-leave-room.dto';
import { CallParticipant } from './entity/call-participant.entity';
import { CallRoom, CallRoomStatus } from './entity/call-room.entity';
import { CallErrorCode, CallException } from './exception/call.exception';
import { CallParticipantRepository } from './repository/call-participant.repository';
import { CallRoomRepository } from './repository/call-room.repository';

const ROOM_CODE = 'room-1';

const joinDto = (): ReqJoinRoomDto =>
  Object.assign(new ReqJoinRoomDto(), { roomCode: ROOM_CODE });
const leaveDto = (): ReqLeaveRoomDto =>
  Object.assign(new ReqLeaveRoomDto(), { roomCode: ROOM_CODE });

const savedRoom = (): CallRoom =>
  Object.assign(CallRoom.create(ROOM_CODE), { id: 'room-id' });

const participant = (socketId: string, room?: CallRoom): CallParticipant =>
  Object.assign(CallParticipant.create('room-id', socketId), {
    id: `p-${socketId}`,
    room,
  });

const uniqueViolation = (): QueryFailedError =>
  new QueryFailedError('INSERT', [], { code: '23505' } as unknown as Error);

describe('CallService', () => {
  let service: CallService;
  let roomRepository: jest.Mocked<CallRoomRepository>;
  let participantRepository: jest.Mocked<CallParticipantRepository>;
  let env: Record<string, string | undefined>;

  beforeEach(async () => {
    env = {};
    const manager = {} as EntityManager;

    const moduleRef = await Test.createTestingModule({
      providers: [
        CallService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(
              (work: (manager: EntityManager) => Promise<unknown>) =>
                work(manager),
            ),
          },
        },
        {
          provide: CallRoomRepository,
          useValue: {
            findOpenByCodeForUpdate: jest.fn(),
            findAllOpen: jest.fn().mockResolvedValue([]),
            save: jest.fn((room: CallRoom) => Promise.resolve(room)),
            saveAll: jest.fn((rooms: CallRoom[]) => Promise.resolve(rooms)),
          },
        },
        {
          provide: CallParticipantRepository,
          useValue: {
            countActive: jest.fn(),
            findActive: jest.fn().mockResolvedValue(null),
            findActiveBySocket: jest.fn().mockResolvedValue([]),
            findOtherActive: jest.fn().mockResolvedValue(null),
            findAllActive: jest.fn().mockResolvedValue([]),
            save: jest.fn((p: CallParticipant) => Promise.resolve(p)),
            saveAll: jest.fn((ps: CallParticipant[]) => Promise.resolve(ps)),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => env[key]) },
        },
      ],
    }).compile();

    service = moduleRef.get(CallService);
    roomRepository = moduleRef.get(CallRoomRepository);
    participantRepository = moduleRef.get(CallParticipantRepository);
  });

  describe('join', () => {
    it('방이 없으면 만들고 첫 입장자는 initiator', async () => {
      roomRepository.findOpenByCodeForUpdate.mockResolvedValue(null);
      roomRepository.save.mockImplementation((room) =>
        Promise.resolve(Object.assign(room, { id: 'room-id' })),
      );
      participantRepository.countActive.mockResolvedValue(0);

      const result = await service.join('A', joinDto());

      expect(result).toMatchObject({
        roomId: 'room-id',
        roomCode: ROOM_CODE,
        peerCount: 1,
        isInitiator: true,
      });
      expect(participantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ roomId: 'room-id', socketId: 'A' }),
        expect.anything(),
      );
    });

    it('두 번째 입장자는 initiator가 아니고 방은 ACTIVE', async () => {
      const room = savedRoom();
      roomRepository.findOpenByCodeForUpdate.mockResolvedValue(room);
      participantRepository.countActive.mockResolvedValue(1);

      const result = await service.join('B', joinDto());

      expect(result.isInitiator).toBe(false);
      expect(result.peerCount).toBe(2);
      expect(room.status).toBe(CallRoomStatus.ACTIVE);
    });

    it('정원이 차면 ROOM_FULL', async () => {
      roomRepository.findOpenByCodeForUpdate.mockResolvedValue(savedRoom());
      participantRepository.countActive.mockResolvedValue(2);

      await expect(service.join('C', joinDto())).rejects.toMatchObject({
        code: CallErrorCode.ROOM_FULL,
      });
      expect(participantRepository.save).not.toHaveBeenCalled();
    });

    it('같은 소켓 재입장은 이력을 추가하지 않는다', async () => {
      roomRepository.findOpenByCodeForUpdate.mockResolvedValue(savedRoom());
      participantRepository.countActive.mockResolvedValue(1);
      participantRepository.findActive.mockResolvedValue(participant('A'));

      const result = await service.join('A', joinDto());

      expect(result.peerCount).toBe(1);
      expect(participantRepository.save).not.toHaveBeenCalled();
    });

    it('동시 방 생성으로 유니크 위반이 나면 한 번 재시도한다', async () => {
      roomRepository.findOpenByCodeForUpdate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedRoom());
      roomRepository.save.mockRejectedValueOnce(uniqueViolation());
      participantRepository.countActive.mockResolvedValue(1);

      const result = await service.join('B', joinDto());

      expect(result.peerCount).toBe(2);
      expect(roomRepository.findOpenByCodeForUpdate).toHaveBeenCalledTimes(2);
    });

    it('유니크 위반이 아닌 오류는 그대로 던진다', async () => {
      roomRepository.findOpenByCodeForUpdate.mockRejectedValue(
        new Error('db down'),
      );

      await expect(service.join('A', joinDto())).rejects.toThrow('db down');
      expect(roomRepository.findOpenByCodeForUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('leave / leaveAll', () => {
    it('퇴장하면 참가 이력을 닫고 상대 알림을 돌려준다', async () => {
      const room = savedRoom();
      room.markJoined(2);
      const me = participant('B');
      roomRepository.findOpenByCodeForUpdate.mockResolvedValue(room);
      participantRepository.findActive.mockResolvedValue(me);
      participantRepository.countActive.mockResolvedValue(1);

      const result = await service.leave('B', leaveDto());

      expect(result).toEqual({ roomCode: ROOM_CODE, peerId: 'B' });
      expect(me.isActive()).toBe(false);
      expect(room.status).toBe(CallRoomStatus.WAITING);
    });

    it('입장 상태가 아니면 null', async () => {
      roomRepository.findOpenByCodeForUpdate.mockResolvedValue(savedRoom());

      await expect(service.leave('X', leaveDto())).resolves.toBeNull();
    });

    it('leaveAll은 소켓이 있던 방마다 퇴장 알림을 만든다', async () => {
      const room = savedRoom();
      participantRepository.findActiveBySocket.mockResolvedValue([
        participant('A', room),
      ]);
      roomRepository.findOpenByCodeForUpdate.mockResolvedValue(room);
      participantRepository.findActive.mockResolvedValue(participant('A'));
      participantRepository.countActive.mockResolvedValue(0);

      const events = await service.leaveAll('A');

      expect(events).toEqual([{ roomCode: ROOM_CODE, peerId: 'A' }]);
      expect(room.status).toBe(CallRoomStatus.ENDED);
    });
  });

  describe('resolveRelayTarget', () => {
    it('같은 방 상대 socket ID를 돌려준다', async () => {
      participantRepository.findActiveBySocket.mockResolvedValue([
        participant('A', savedRoom()),
      ]);
      participantRepository.findOtherActive.mockResolvedValue(participant('B'));

      await expect(service.resolveRelayTarget('A', ROOM_CODE)).resolves.toBe(
        'B',
      );
    });

    it('방에 없으면 NOT_IN_ROOM', async () => {
      await expect(
        service.resolveRelayTarget('C', ROOM_CODE),
      ).rejects.toMatchObject({ code: CallErrorCode.NOT_IN_ROOM });
    });

    it('상대가 없으면 PEER_NOT_FOUND', async () => {
      participantRepository.findActiveBySocket.mockResolvedValue([
        participant('A', savedRoom()),
      ]);

      const error: unknown = await service
        .resolveRelayTarget('A', ROOM_CODE)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CallException);
      expect(error).toMatchObject({ code: CallErrorCode.PEER_NOT_FOUND });
    });
  });

  describe('getIceServers', () => {
    it('기본은 STUN만', () => {
      const { iceServers } = service.getIceServers();
      expect(iceServers).toHaveLength(1);
      expect(iceServers[0].urls[0]).toMatch(/^stun:/);
    });

    it('TURN 환경 변수가 모두 있으면 TURN 포함', () => {
      env.TURN_URL = 'turn:turn.example.com:3478';
      env.TURN_USERNAME = 'user';
      env.TURN_CREDENTIAL = 'secret';

      const { iceServers } = service.getIceServers();
      expect(iceServers[1]).toEqual({
        urls: ['turn:turn.example.com:3478'],
        username: 'user',
        credential: 'secret',
      });
    });
  });

  describe('onApplicationBootstrap', () => {
    it('남은 참가 이력은 퇴장, 진행 중 방은 종료한다', async () => {
      const stale = participant('A');
      const room = savedRoom();
      participantRepository.findAllActive.mockResolvedValue([stale]);
      roomRepository.findAllOpen.mockResolvedValue([room]);

      await service.onApplicationBootstrap();

      expect(stale.isActive()).toBe(false);
      expect(room.status).toBe(CallRoomStatus.ENDED);
      expect(participantRepository.saveAll).toHaveBeenCalledWith(
        [stale],
        expect.anything(),
      );
      expect(roomRepository.saveAll).toHaveBeenCalledWith(
        [room],
        expect.anything(),
      );
    });
  });
});

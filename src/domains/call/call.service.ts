import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { ReqJoinRoomDto } from './dto/req/req-join-room.dto';
import { ReqLeaveRoomDto } from './dto/req/req-leave-room.dto';
import { ResIceServerDto } from './dto/res/res-ice-server.dto';
import { ResIceServersDto } from './dto/res/res-ice-servers.dto';
import { ResPeerEventDto } from './dto/res/res-peer-event.dto';
import { ResRoomJoinedDto } from './dto/res/res-room-joined.dto';
import { CallParticipant } from './entity/call-participant.entity';
import { CallRoom } from './entity/call-room.entity';
import { CallException } from './exception/call.exception';
import { CallParticipantRepository } from './repository/call-participant.repository';
import { CallRoomRepository } from './repository/call-room.repository';

@Injectable()
export class CallService implements OnApplicationBootstrap {
  private static readonly DEFAULT_STUN_URLS = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
  ];
  private static readonly PG_UNIQUE_VIOLATION = '23505';

  private readonly logger = new Logger(CallService.name);

  /**
   * CallService 생성자
   *
   * @author MinkeySon
   * @description 트랜잭션용 DataSource, 통화방·참가 이력 리포지토리, 환경 설정을 주입받는다.
   * @param dataSource 트랜잭션 시작용 TypeORM DataSource
   * @param callRoomRepository 통화방 리포지토리
   * @param callParticipantRepository 참가 이력 리포지토리
   * @param configService TURN 설정 조회용 ConfigService
   */
  constructor(
    private readonly dataSource: DataSource,
    private readonly callRoomRepository: CallRoomRepository,
    private readonly callParticipantRepository: CallParticipantRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 서버 기동 시 접속 중으로 남은 참가 이력·방 정리 함수
   *
   * @author MinkeySon
   * @description 서버 재시작으로 무효가 된 socket 참가 이력을 퇴장 처리하고, 진행 중으로 남은 방을 종료한다.
   * @returns 없음
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const participants =
        await this.callParticipantRepository.findAllActive(manager);
      participants.forEach((participant) => participant.leave());
      await this.callParticipantRepository.saveAll(participants, manager);

      const rooms = await this.callRoomRepository.findAllOpen(manager);
      rooms.forEach((room) => room.markLeft(0));
      await this.callRoomRepository.saveAll(rooms, manager);

      if (participants.length || rooms.length) {
        this.logger.log(
          `재시작 정리: 참가 이력 ${participants.length}건 퇴장, 방 ${rooms.length}건 종료`,
        );
      }
    });
  }

  /**
   * 통화방 입장 함수
   *
   * @author MinkeySon
   * @description 방 코드로 진행 중인 방에 입장한다. 방이 없으면 만들고, 같은 소켓의 재입장은 그대로 성공 처리한다.
   *   방이 없을 때 동시에 생성되어 유니크 제약에 걸리면 한 번 재시도한다.
   * @param socketId 입장하는 클라이언트 socket ID
   * @param dto 입장 요청 (roomCode)
   * @returns 입장 결과 (방 ID, 현재 인원, initiator 여부)
   * @throws {CallException} ROOM_FULL — 정원이 가득 찬 경우
   */
  async join(socketId: string, dto: ReqJoinRoomDto): Promise<ResRoomJoinedDto> {
    try {
      return await this.joinOnce(socketId, dto);
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;
      return this.joinOnce(socketId, dto);
    }
  }

  /**
   * 통화방 퇴장 함수
   *
   * @author MinkeySon
   * @description 요청한 방에서 퇴장 처리하고 방 상태를 갱신한다.
   * @param socketId 퇴장하는 클라이언트 socket ID
   * @param dto 퇴장 요청 (roomCode)
   * @returns 상대에게 보낼 퇴장 알림. 입장 상태가 아니었으면 null
   */
  leave(
    socketId: string,
    dto: ReqLeaveRoomDto,
  ): Promise<ResPeerEventDto | null> {
    return this.leaveByCode(socketId, dto.roomCode);
  }

  /**
   * 소켓의 모든 방 퇴장 함수
   *
   * @author MinkeySon
   * @description 연결이 끊긴 소켓이 접속 중인 모든 방에서 퇴장 처리한다. 방마다 `leaveByCode`를 재사용한다.
   * @param socketId 연결이 끊긴 클라이언트 socket ID
   * @returns 방별 상대에게 보낼 퇴장 알림 목록
   */
  async leaveAll(socketId: string): Promise<ResPeerEventDto[]> {
    const participants =
      await this.callParticipantRepository.findActiveBySocket(socketId);
    const events: ResPeerEventDto[] = [];
    for (const participant of participants) {
      if (!participant.room) continue;
      const event = await this.leaveByCode(socketId, participant.room.roomCode);
      if (event) events.push(event);
    }
    return events;
  }

  /**
   * 시그널링 중계 대상 조회 함수
   *
   * @author MinkeySon
   * @description 보낸 소켓이 방에 입장해 있는지 확인하고, 같은 방 상대의 socket ID를 돌려준다.
   * @param socketId 시그널을 보낸 클라이언트 socket ID
   * @param roomCode 시그널을 보낼 방 코드
   * @returns 상대 socket ID
   * @throws {CallException} NOT_IN_ROOM — 보낸 소켓이 방에 없는 경우
   * @throws {CallException} PEER_NOT_FOUND — 방에 상대가 없는 경우
   */
  async resolveRelayTarget(
    socketId: string,
    roomCode: string,
  ): Promise<string> {
    const participants =
      await this.callParticipantRepository.findActiveBySocket(socketId);
    const me = participants.find(
      (participant) => participant.room?.roomCode === roomCode,
    );
    if (!me) throw CallException.notInRoom(roomCode);

    const peer = await this.callParticipantRepository.findOtherActive(
      me.roomId,
      socketId,
    );
    if (!peer) throw CallException.peerNotFound(roomCode);
    return peer.socketId;
  }

  /**
   * ICE 서버 목록 조회 함수
   *
   * @author MinkeySon
   * @description 기본 STUN 서버와, 환경 변수(TURN_URL/TURN_USERNAME/TURN_CREDENTIAL)가 모두 있으면 TURN 서버를 함께 돌려준다.
   * @returns RTCPeerConnection iceServers 설정값
   */
  getIceServers(): ResIceServersDto {
    const servers = [ResIceServerDto.stun(CallService.DEFAULT_STUN_URLS)];
    const turnUrl = this.configService.get<string>('TURN_URL');
    const turnUsername = this.configService.get<string>('TURN_USERNAME');
    const turnCredential = this.configService.get<string>('TURN_CREDENTIAL');
    if (turnUrl && turnUsername && turnCredential) {
      servers.push(ResIceServerDto.turn(turnUrl, turnUsername, turnCredential));
    }
    return ResIceServersDto.from(servers);
  }

  /**
   * 통화방 입장 1회 시도 함수
   *
   * @author MinkeySon
   * @description 트랜잭션 안에서 방 row를 잠그고 정원을 확인한 뒤 참가 이력을 추가한다.
   * @param socketId 입장하는 클라이언트 socket ID
   * @param dto 입장 요청 (roomCode)
   * @returns 입장 결과
   * @throws {CallException} ROOM_FULL — 정원이 가득 찬 경우
   * @throws {QueryFailedError} 동시 방 생성으로 유니크 제약 위반 시
   */
  private joinOnce(
    socketId: string,
    dto: ReqJoinRoomDto,
  ): Promise<ResRoomJoinedDto> {
    return this.dataSource.transaction(async (manager) => {
      const room = await this.findOrCreateOpenRoom(dto, manager);
      const activeCount = await this.callParticipantRepository.countActive(
        room.id,
        manager,
      );

      const existing = await this.callParticipantRepository.findActive(
        room.id,
        socketId,
        manager,
      );
      if (existing) return ResRoomJoinedDto.from(room, activeCount);

      if (!room.canAccept(activeCount)) {
        throw CallException.roomFull(dto.roomCode);
      }

      await this.callParticipantRepository.save(
        CallParticipant.create(room.id, socketId),
        manager,
      );
      room.markJoined(activeCount + 1);
      await this.callRoomRepository.save(room, manager);
      return ResRoomJoinedDto.from(room, activeCount + 1);
    });
  }

  /**
   * 진행 중인 방 조회 또는 생성 함수
   *
   * @author MinkeySon
   * @description 방 코드로 진행 중인 방을 잠금 조회하고, 없으면 새로 만든다.
   * @param dto 입장 요청 (roomCode)
   * @param manager 진행 중인 트랜잭션의 EntityManager
   * @returns 잠금 또는 새로 생성된 통화방
   */
  private async findOrCreateOpenRoom(
    dto: ReqJoinRoomDto,
    manager: EntityManager,
  ): Promise<CallRoom> {
    const room = await this.callRoomRepository.findOpenByCodeForUpdate(
      dto.roomCode,
      manager,
    );
    return room ?? this.callRoomRepository.save(dto.toEntity(), manager);
  }

  /**
   * 방 코드 기준 퇴장 함수
   *
   * @author MinkeySon
   * @description 트랜잭션 안에서 방 row를 잠그고 참가 이력을 퇴장 처리한 뒤, 남은 인원으로 방 상태를 갱신한다.
   * @param socketId 퇴장하는 클라이언트 socket ID
   * @param roomCode 퇴장할 방 코드
   * @returns 상대에게 보낼 퇴장 알림. 방이 없거나 입장 상태가 아니면 null
   */
  private leaveByCode(
    socketId: string,
    roomCode: string,
  ): Promise<ResPeerEventDto | null> {
    return this.dataSource.transaction(async (manager) => {
      const room = await this.callRoomRepository.findOpenByCodeForUpdate(
        roomCode,
        manager,
      );
      if (!room) return null;

      const participant = await this.callParticipantRepository.findActive(
        room.id,
        socketId,
        manager,
      );
      if (!participant) return null;

      participant.leave();
      await this.callParticipantRepository.save(participant, manager);
      room.markLeft(
        await this.callParticipantRepository.countActive(room.id, manager),
      );
      await this.callRoomRepository.save(room, manager);
      return ResPeerEventDto.from(room, socketId);
    });
  }

  /**
   * PostgreSQL 유니크 제약 위반 여부 판별 함수
   *
   * @author MinkeySon
   * @description TypeORM QueryFailedError의 드라이버 에러 코드가 23505인지 확인한다.
   * @param error 잡힌 예외
   * @returns 유니크 제약 위반이면 true
   */
  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError = error.driverError as { code?: string };
    return driverError.code === CallService.PG_UNIQUE_VIOLATION;
  }
}

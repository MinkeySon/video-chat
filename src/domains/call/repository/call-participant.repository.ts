import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOptionsWhere,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { CallParticipant } from '../entity/call-participant.entity';

@Injectable()
export class CallParticipantRepository {
  constructor(
    @InjectRepository(CallParticipant)
    private readonly repository: Repository<CallParticipant>,
  ) {}

  /** 방의 접속 중 참가자 수 */
  countActive(roomId: string, manager?: EntityManager): Promise<number> {
    return this.repo(manager).countBy(this.activeWhere({ roomId }));
  }

  /** 방에서 특정 소켓의 접속 중 참가 이력 */
  findActive(
    roomId: string,
    socketId: string,
    manager?: EntityManager,
  ): Promise<CallParticipant | null> {
    return this.repo(manager).findOneBy(this.activeWhere({ roomId, socketId }));
  }

  /** 소켓이 접속 중인 모든 참가 이력 (방 포함). disconnect 처리용 */
  findActiveBySocket(
    socketId: string,
    manager?: EntityManager,
  ): Promise<CallParticipant[]> {
    return this.repo(manager).find({
      where: this.activeWhere({ socketId }),
      relations: { room: true },
    });
  }

  /** 같은 방에서 나를 제외한 접속 중 참가자 (1:1이므로 최대 1명) */
  findOtherActive(
    roomId: string,
    socketId: string,
    manager?: EntityManager,
  ): Promise<CallParticipant | null> {
    return this.repo(manager).findOneBy(
      this.activeWhere({ roomId, socketId: Not(socketId) }),
    );
  }

  /** 접속 중으로 남은 참가 이력 전체. 서버 재시작 정리용 */
  findAllActive(manager?: EntityManager): Promise<CallParticipant[]> {
    return this.repo(manager).findBy(this.activeWhere({}));
  }

  save(
    participant: CallParticipant,
    manager?: EntityManager,
  ): Promise<CallParticipant> {
    return this.repo(manager).save(participant);
  }

  saveAll(
    participants: CallParticipant[],
    manager?: EntityManager,
  ): Promise<CallParticipant[]> {
    return this.repo(manager).save(participants);
  }

  /** 접속 중(left_at IS NULL) 조건을 붙인다. */
  private activeWhere(
    where: FindOptionsWhere<CallParticipant>,
  ): FindOptionsWhere<CallParticipant> {
    return { ...where, leftAt: IsNull() };
  }

  private repo(manager?: EntityManager): Repository<CallParticipant> {
    return manager ? manager.getRepository(CallParticipant) : this.repository;
  }
}

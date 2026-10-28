import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';
import { CallRoom, CallRoomStatus } from '../entity/call-room.entity';

@Injectable()
export class CallRoomRepository {
  constructor(
    @InjectRepository(CallRoom)
    private readonly repository: Repository<CallRoom>,
  ) {}

  /** 진행 중(ENDED 아님)인 방을 코드로 찾고 row 락을 건다. 트랜잭션 안에서만 호출한다. */
  findOpenByCodeForUpdate(
    roomCode: string,
    manager: EntityManager,
  ): Promise<CallRoom | null> {
    return this.repo(manager)
      .createQueryBuilder('room')
      .setLock('pessimistic_write')
      .where('room.roomCode = :roomCode', { roomCode })
      .andWhere('room.status <> :ended', { ended: CallRoomStatus.ENDED })
      .getOne();
  }

  /** 진행 중(ENDED 아님)인 방 전체. 서버 재시작 정리용 */
  findAllOpen(manager?: EntityManager): Promise<CallRoom[]> {
    return this.repo(manager).findBy({ status: Not(CallRoomStatus.ENDED) });
  }

  save(room: CallRoom, manager?: EntityManager): Promise<CallRoom> {
    return this.repo(manager).save(room);
  }

  saveAll(rooms: CallRoom[], manager?: EntityManager): Promise<CallRoom[]> {
    return this.repo(manager).save(rooms);
  }

  private repo(manager?: EntityManager): Repository<CallRoom> {
    return manager ? manager.getRepository(CallRoom) : this.repository;
  }
}

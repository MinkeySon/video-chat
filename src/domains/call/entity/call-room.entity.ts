import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CallParticipant } from './call-participant.entity';

export enum CallRoomStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

@Entity('call_room')
@Index('uq_call_room_open_room_code', ['roomCode'], {
  unique: true,
  where: `"status" <> 'ENDED'`,
})
export class CallRoom {
  /** 1:1 통화 기본 정원 */
  static readonly DEFAULT_MAX_PARTICIPANTS = 2;

  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_call_room',
    comment: '통화방 PK',
  })
  id: string;

  @Column({
    type: 'varchar',
    length: 64,
    name: 'room_code',
    comment:
      '클라이언트가 입장 시 쓰는 방 코드. 진행 중(ENDED 아님) 방 기준 유일',
  })
  roomCode: string;

  @Column({
    type: 'varchar',
    length: 16,
    name: 'status',
    default: CallRoomStatus.WAITING,
    comment:
      '방 상태. WAITING(정원 미달 대기) / ACTIVE(정원 충족 통화 중) / ENDED(종료)',
  })
  status: CallRoomStatus;

  @Column({
    type: 'smallint',
    name: 'max_participants',
    default: CallRoom.DEFAULT_MAX_PARTICIPANTS,
    comment: '최대 참가자 수. 1:1 통화는 2',
  })
  maxParticipants: number;

  @Column({
    type: 'timestamptz',
    name: 'started_at',
    nullable: true,
    comment: '정원 충족(통화 시작) 최초 시각',
  })
  startedAt: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'ended_at',
    nullable: true,
    comment: '마지막 참가자 퇴장(통화 종료) 시각',
  })
  endedAt: Date | null;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    comment: '방 생성 시각',
  })
  createdAt: Date;

  @OneToMany(() => CallParticipant, (participant) => participant.room)
  participants?: CallParticipant[];

  static create(roomCode: string): CallRoom {
    const room = new CallRoom();
    room.roomCode = roomCode;
    room.status = CallRoomStatus.WAITING;
    room.maxParticipants = CallRoom.DEFAULT_MAX_PARTICIPANTS;
    room.startedAt = null;
    room.endedAt = null;
    return room;
  }

  isEnded(): boolean {
    return this.status === CallRoomStatus.ENDED;
  }

  /** 현재 접속 인원 기준으로 한 명 더 받을 수 있는지 */
  canAccept(activeCount: number): boolean {
    return !this.isEnded() && activeCount < this.maxParticipants;
  }

  /** 입장 반영 후 인원(activeCount)으로 상태를 갱신한다. */
  markJoined(activeCount: number): void {
    if (activeCount < this.maxParticipants) return;
    this.status = CallRoomStatus.ACTIVE;
    this.startedAt ??= new Date();
  }

  /** 퇴장 반영 후 인원(activeCount)으로 상태를 갱신한다. */
  markLeft(activeCount: number): void {
    if (this.isEnded()) return;
    if (activeCount === 0) {
      this.status = CallRoomStatus.ENDED;
      this.endedAt = new Date();
      return;
    }
    if (activeCount < this.maxParticipants) {
      this.status = CallRoomStatus.WAITING;
    }
  }
}

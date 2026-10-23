import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { CallRoom } from './call-room.entity';

@Entity('call_participant')
@Index('ix_call_participant_active_room_id', ['roomId'], {
  where: '"left_at" IS NULL',
})
@Index('ix_call_participant_active_socket_id', ['socketId'], {
  where: '"left_at" IS NULL',
})
export class CallParticipant {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_call_participant',
    comment: '참가 이력 PK',
  })
  id: string;

  @Column({ type: 'uuid', name: 'room_id', comment: '참가한 통화방 ID' })
  roomId: string;

  @ManyToOne(() => CallRoom, (room) => room.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'room_id',
    foreignKeyConstraintName: 'fk_call_participant_room_id',
  })
  room?: Relation<CallRoom>;

  @Column({
    type: 'varchar',
    length: 64,
    name: 'socket_id',
    comment: '참가 시점 socket.io 연결 ID',
  })
  socketId: string;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'joined_at',
    comment: '입장 시각',
  })
  joinedAt: Date;

  @Column({
    type: 'timestamptz',
    name: 'left_at',
    nullable: true,
    comment: '퇴장 시각. null이면 접속 중',
  })
  leftAt: Date | null;

  static create(roomId: string, socketId: string): CallParticipant {
    const participant = new CallParticipant();
    participant.roomId = roomId;
    participant.socketId = socketId;
    participant.leftAt = null;
    return participant;
  }

  isActive(): boolean {
    return this.leftAt === null;
  }

  /** 퇴장 처리. 이미 퇴장했으면 최초 시각을 유지한다. */
  leave(): void {
    if (!this.isActive()) return;
    this.leftAt = new Date();
  }
}

import { CallParticipant } from './call-participant.entity';
import { CallRoom, CallRoomStatus } from './call-room.entity';

describe('CallRoom', () => {
  let room: CallRoom;

  beforeEach(() => {
    room = CallRoom.create('room-1');
  });

  it('생성 시 WAITING, 정원 2', () => {
    expect(room.status).toBe(CallRoomStatus.WAITING);
    expect(room.maxParticipants).toBe(2);
    expect(room.startedAt).toBeNull();
    expect(room.endedAt).toBeNull();
  });

  it('정원 미만이면 받고, 정원이면 거절한다', () => {
    expect(room.canAccept(0)).toBe(true);
    expect(room.canAccept(1)).toBe(true);
    expect(room.canAccept(2)).toBe(false);
  });

  it('정원이 차면 ACTIVE가 되고 startedAt을 기록한다', () => {
    room.markJoined(1);
    expect(room.status).toBe(CallRoomStatus.WAITING);

    room.markJoined(2);
    expect(room.status).toBe(CallRoomStatus.ACTIVE);
    expect(room.startedAt).toBeInstanceOf(Date);
  });

  it('1명 남으면 WAITING으로 돌아가고 startedAt은 유지한다', () => {
    room.markJoined(2);
    const startedAt = room.startedAt;

    room.markLeft(1);
    expect(room.status).toBe(CallRoomStatus.WAITING);
    expect(room.startedAt).toBe(startedAt);

    room.markJoined(2);
    expect(room.startedAt).toBe(startedAt);
  });

  it('0명이 되면 ENDED가 되고 더 이상 받지 않는다', () => {
    room.markJoined(2);
    room.markLeft(0);

    expect(room.status).toBe(CallRoomStatus.ENDED);
    expect(room.endedAt).toBeInstanceOf(Date);
    expect(room.canAccept(0)).toBe(false);
  });

  it('ENDED 이후 markLeft는 endedAt을 바꾸지 않는다', () => {
    room.markLeft(0);
    const endedAt = room.endedAt;

    room.markLeft(0);
    expect(room.endedAt).toBe(endedAt);
  });
});

describe('CallParticipant', () => {
  it('생성 시 접속 중, leave 후 퇴장 시각을 한 번만 기록한다', () => {
    const participant = CallParticipant.create('room-id', 'socket-a');
    expect(participant.isActive()).toBe(true);

    participant.leave();
    const leftAt = participant.leftAt;
    expect(participant.isActive()).toBe(false);
    expect(leftAt).toBeInstanceOf(Date);

    participant.leave();
    expect(participant.leftAt).toBe(leftAt);
  });
});

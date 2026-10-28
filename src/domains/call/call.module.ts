import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallController } from './call.controller';
import { CallGateway } from './call.gateway';
import { CallService } from './call.service';
import { CallParticipant } from './entity/call-participant.entity';
import { CallRoom } from './entity/call-room.entity';
import { CallParticipantRepository } from './repository/call-participant.repository';
import { CallRoomRepository } from './repository/call-room.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CallRoom, CallParticipant])],
  controllers: [CallController],
  providers: [
    CallRoomRepository,
    CallParticipantRepository,
    CallService,
    CallGateway,
  ],
})
export class CallModule {}

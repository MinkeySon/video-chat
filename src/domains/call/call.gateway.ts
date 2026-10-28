import { UseFilters, UsePipes } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CALL_EVENTS, CallSdpEvent } from './call.constants';
import { CallService } from './call.service';
import { ReqJoinRoomDto } from './dto/req/req-join-room.dto';
import { ReqLeaveRoomDto } from './dto/req/req-leave-room.dto';
import { ReqRelayIceDto } from './dto/req/req-relay-ice.dto';
import { ReqRelaySdpDto } from './dto/req/req-relay-sdp.dto';
import { ResPeerEventDto } from './dto/res/res-peer-event.dto';
import { ResRelayIceDto } from './dto/res/res-relay-ice.dto';
import { ResRelaySdpDto } from './dto/res/res-relay-sdp.dto';
import { ResRoomJoinedDto } from './dto/res/res-room-joined.dto';
import { CallWsExceptionFilter } from './exception/call-ws-exception.filter';
import { WsValidationPipe } from './pipe/ws-validation.pipe';

/**
 * 1:1 화상통화 시그널링 게이트웨이.
 * 이벤트 입출력만 담당하고, 입장 가능 여부·중계 대상 판단은 CallService에 위임한다.
 * socket.io room 이름은 roomCode를 그대로 쓴다.
 */
@WebSocketGateway({ cors: { origin: '*' } })
@UsePipes(WsValidationPipe)
@UseFilters(CallWsExceptionFilter)
export class CallGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly callService: CallService) {}

  @SubscribeMessage(CALL_EVENTS.JOIN)
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReqJoinRoomDto,
  ): Promise<WsResponse<ResRoomJoinedDto>> {
    const joined = await this.callService.join(client.id, dto);
    await client.join(dto.roomCode);
    client
      .to(dto.roomCode)
      .emit(CALL_EVENTS.PEER_JOINED, ResPeerEventDto.from(joined, client.id));
    return { event: CALL_EVENTS.JOINED, data: joined };
  }

  @SubscribeMessage(CALL_EVENTS.LEAVE)
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReqLeaveRoomDto,
  ): Promise<void> {
    const left = await this.callService.leave(client.id, dto);
    await client.leave(dto.roomCode);
    if (left) this.notifyPeerLeft(left);
  }

  @SubscribeMessage(CALL_EVENTS.OFFER)
  offer(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReqRelaySdpDto,
  ): Promise<void> {
    return this.relaySdp(CALL_EVENTS.OFFER, client, dto);
  }

  @SubscribeMessage(CALL_EVENTS.ANSWER)
  answer(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReqRelaySdpDto,
  ): Promise<void> {
    return this.relaySdp(CALL_EVENTS.ANSWER, client, dto);
  }

  @SubscribeMessage(CALL_EVENTS.ICE)
  async ice(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReqRelayIceDto,
  ): Promise<void> {
    const targetId = await this.callService.resolveRelayTarget(
      client.id,
      dto.roomCode,
    );
    this.server
      .to(targetId)
      .emit(CALL_EVENTS.ICE, ResRelayIceDto.from(dto, client.id));
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const events = await this.callService.leaveAll(client.id);
    events.forEach((event) => this.notifyPeerLeft(event));
  }

  private async relaySdp(
    event: CallSdpEvent,
    client: Socket,
    dto: ReqRelaySdpDto,
  ): Promise<void> {
    const targetId = await this.callService.resolveRelayTarget(
      client.id,
      dto.roomCode,
    );
    this.server.to(targetId).emit(event, ResRelaySdpDto.from(dto, client.id));
  }

  private notifyPeerLeft(event: ResPeerEventDto): void {
    this.server.to(event.roomCode).emit(CALL_EVENTS.PEER_LEFT, event);
  }
}

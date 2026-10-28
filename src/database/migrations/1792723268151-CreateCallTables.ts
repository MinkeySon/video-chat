import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCallTables1792723268151 implements MigrationInterface {
  name = 'CreateCallTables1792723268151';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "call_room" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "room_code" character varying(64) NOT NULL,
                "status" character varying(16) NOT NULL DEFAULT 'WAITING',
                "max_participants" smallint NOT NULL DEFAULT '2',
                "started_at" TIMESTAMP WITH TIME ZONE,
                "ended_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "pk_call_room" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "call_room"."id" IS '통화방 PK';
            COMMENT ON COLUMN "call_room"."room_code" IS '클라이언트가 입장 시 쓰는 방 코드. 진행 중(ENDED 아님) 방 기준 유일';
            COMMENT ON COLUMN "call_room"."status" IS '방 상태. WAITING(정원 미달 대기) / ACTIVE(정원 충족 통화 중) / ENDED(종료)';
            COMMENT ON COLUMN "call_room"."max_participants" IS '최대 참가자 수. 1:1 통화는 2';
            COMMENT ON COLUMN "call_room"."started_at" IS '정원 충족(통화 시작) 최초 시각';
            COMMENT ON COLUMN "call_room"."ended_at" IS '마지막 참가자 퇴장(통화 종료) 시각';
            COMMENT ON COLUMN "call_room"."created_at" IS '방 생성 시각'
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_call_room_open_room_code" ON "call_room" ("room_code")
            WHERE "status" <> 'ENDED'
        `);
    await queryRunner.query(`
            CREATE TABLE "call_participant" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "room_id" uuid NOT NULL,
                "socket_id" character varying(64) NOT NULL,
                "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "left_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "pk_call_participant" PRIMARY KEY ("id")
            );
            COMMENT ON COLUMN "call_participant"."id" IS '참가 이력 PK';
            COMMENT ON COLUMN "call_participant"."room_id" IS '참가한 통화방 ID';
            COMMENT ON COLUMN "call_participant"."socket_id" IS '참가 시점 socket.io 연결 ID';
            COMMENT ON COLUMN "call_participant"."joined_at" IS '입장 시각';
            COMMENT ON COLUMN "call_participant"."left_at" IS '퇴장 시각. null이면 접속 중'
        `);
    await queryRunner.query(`
            CREATE INDEX "ix_call_participant_active_socket_id" ON "call_participant" ("socket_id")
            WHERE "left_at" IS NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "ix_call_participant_active_room_id" ON "call_participant" ("room_id")
            WHERE "left_at" IS NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "call_participant"
            ADD CONSTRAINT "fk_call_participant_room_id" FOREIGN KEY ("room_id") REFERENCES "call_room"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "call_participant" DROP CONSTRAINT "fk_call_participant_room_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."ix_call_participant_active_room_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."ix_call_participant_active_socket_id"
        `);
    await queryRunner.query(`
            DROP TABLE "call_participant"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."uq_call_room_open_room_code"
        `);
    await queryRunner.query(`
            DROP TABLE "call_room"
        `);
  }
}

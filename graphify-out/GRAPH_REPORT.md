# Graph Report - video-chat  (2026-10-29)

## Corpus Check
- Corpus is ~10,063 words - fits in a single context window. You may not need a graph.

## Summary
- 407 nodes · 780 edges · 29 communities (17 shown, 12 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.85)
- Token cost: 71,481 input · 0 output

## Community Hubs (Navigation)
- 모바일 웹 클라이언트
- CallService 입퇴장 로직
- DB 설정·마이그레이션
- 요청 DTO 검증·서비스 테스트
- CallGateway 시그널 중계
- 참가자 Entity·Repository
- 이벤트 상수·예외 코드
- TypeScript 컴파일 설정
- 런타임 의존성
- npm 스크립트
- 개발 의존성
- 패키지 메타데이터
- Nest 기본 App
- ESLint 설정
- Jest 설정
- 통화방 상태 설계 문서
- Nest CLI 설정
- 앱 부트스트랩
- 빌드용 tsconfig
- eslintrc 의존성
- Nest CLI 의존성
- Nest schematics 의존성
- Nest testing 의존성
- socket.io-client 의존성
- tsconfig-paths 의존성
- Jest 타입
- Node 타입
- TypeScript 의존성
- 트랙 토글

## God Nodes (most connected - your core abstractions)
1. `CallRoom` - 32 edges
2. `CallParticipant` - 27 edges
3. `compilerOptions` - 22 edges
4. `CallService` - 19 edges
5. `scripts` - 18 edges
6. `CallParticipantRepository` - 16 edges
7. `CallGateway` - 15 edges
8. `@nestjs/common` - 14 edges
9. `ReqRoomCodeDto` - 13 edges
10. `typeorm` - 12 edges

## Surprising Connections (you probably didn't know these)
- `join form submit handler` --implements--> `모바일 웹 HTTPS 필수`  [INFERRED]
  public/index.html → README.md
- `call.createPeer` --references--> `TURN 서버`  [INFERRED]
  public/index.html → README.md
- `call.createPeer` --implements--> `WebRTC P2P 연결`  [INFERRED]
  public/index.html → README.md
- `call.makeOffer` --references--> `SDP`  [INFERRED]
  public/index.html → README.md
- `call.addCandidate` --references--> `ICE candidate`  [INFERRED]
  public/index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offer/Answer/ICE 시그널링 흐름** — public_index_call_makeoffer, public_index_call_acceptoffer, public_index_call_addcandidate, public_index_call_flushcandidates, readme_callgateway, readme_event_protocol [INFERRED 0.85]
- **방 정원 동시성 제어** — readme_pessimistic_lock, readme_unique_violation_retry, readme_partial_unique_index_room_code, readme_join_retry, readme_callroom [EXTRACTED 1.00]
- **Gateway-Service-Entity 계층 구조** — readme_callgateway, readme_callservice, readme_callroom, readme_callparticipant, readme_callexception [EXTRACTED 1.00]

## Communities (29 total, 12 thin omitted)

### Community 0 - "모바일 웹 클라이언트"
Cohesion: 0.06
Nodes (42): 1:1 화상통화 테스트 클라이언트 (index.html), call, call.acceptOffer, call.addCandidate, call.closePeer, call.connectSocket, call.createPeer, call.flipCamera (+34 more)

### Community 1 - "CallService 입퇴장 로직"
Cohesion: 0.09
Nodes (7): CallService, savedRoom(), ReqJoinRoomDto, ResPeerEventDto, ResRoomJoinedDto, CallRoom, CallRoomRepository

### Community 2 - "DB 설정·마이그레이션"
Cohesion: 0.10
Nodes (16): @nestjs/config@^4.0.4, @nestjs/common, @nestjs/config, @nestjs/typeorm, typeorm, CreateCallTables1792723268151, buildDataSourceOptions(), buildTypeOrmOptions() (+8 more)

### Community 3 - "요청 DTO 검증·서비스 테스트"
Cohesion: 0.11
Nodes (9): class-validator, joinDto(), leaveDto(), participant(), ReqIceCandidateDto, ReqLeaveRoomDto, ReqRelayIceDto, ReqRoomCodeDto (+1 more)

### Community 4 - "CallGateway 시그널 중계"
Cohesion: 0.14
Nodes (4): CallGateway, ReqRelaySdpDto, ReqSessionDescriptionDto, ResRelaySdpDto

### Community 6 - "이벤트 상수·예외 코드"
Cohesion: 0.13
Nodes (12): @nestjs/websockets@^11.2.7, @nestjs/websockets, CALL_EVENTS, CallSdpEvent, CallErrorCode, INVALID_PAYLOAD, NOT_IN_ROOM, PEER_NOT_FOUND (+4 more)

### Community 7 - "TypeScript 컴파일 설정"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 8 - "런타임 의존성"
Cohesion: 0.10
Nodes (21): dependencies, class-transformer@^0.5.1, class-validator@^0.15.1, @nestjs/common@^11.0.1, @nestjs/platform-express@^11.0.1, @nestjs/platform-socket.io@^11.2.7, @nestjs/serve-static@^5.0.5, @nestjs/typeorm@^11.0.3 (+13 more)

### Community 9 - "npm 스크립트"
Cohesion: 0.11
Nodes (18): scripts, build, format, lint, migration:generate, migration:revert, migration:run, migration:show (+10 more)

### Community 10 - "개발 의존성"
Cohesion: 0.12
Nodes (17): devDependencies, eslint@^9.18.0, eslint-config-prettier@^10.0.1, jest@^30.0.0, prettier@^3.4.2, source-map-support@^0.5.21, supertest@^7.0.0, ts-jest@^29.2.5 (+9 more)

### Community 11 - "패키지 메타데이터"
Cohesion: 0.15
Nodes (12): author, description, ts-loader@^9.5.2, ts-node@^10.9.2, @types/express@^5.0.0, license, name, private (+4 more)

### Community 13 - "ESLint 설정"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 14 - "Jest 설정"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 15 - "통화방 상태 설계 문서"
Cohesion: 0.25
Nodes (8): CallParticipant Entity, CallRoom Entity, CallRoom.markLeft, 통화방 상태 머신 (WAITING/ACTIVE/ENDED), onApplicationBootstrap 재시작 정리, PostgreSQL, socket.io Redis adapter, 서버 재시작 시 잔여 상태 문제

### Community 16 - "Nest CLI 설정"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 17 - "앱 부트스트랩"
Cohesion: 0.33
Nodes (3): @nestjs/core@^11.0.1, @nestjs/core, AppModule

### Community 18 - "빌드용 tsconfig"
Cohesion: 0.50
Nodes (3): ./tsconfig.json, exclude, extends

## Knowledge Gaps
- **23 isolated node(s):** `WAITING`, `ACTIVE`, `ENDED`, `ROOM_FULL`, `NOT_IN_ROOM` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 137 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `DB 설정·마이그레이션` to `런타임 의존성`, `패키지 메타데이터`, `Nest 기본 App`, `이벤트 상수·예외 코드`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `WAITING`, `ACTIVE`, `ENDED` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `모바일 웹 클라이언트` be split into smaller, more focused modules?**
  _Cohesion score 0.06471631205673758 - nodes in this community are weakly interconnected._
- **Why does `typeorm` connect `DB 설정·마이그레이션` to `런타임 의존성`, `요청 DTO 검증·서비스 테스트`, `패키지 메타데이터`, `이벤트 상수·예외 코드`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `CallService 입퇴장 로직` be split into smaller, more focused modules?**
  _Cohesion score 0.09080841638981174 - nodes in this community are weakly interconnected._
- **Why does `CallRoom` connect `CallService 입퇴장 로직` to `DB 설정·마이그레이션`, `요청 DTO 검증·서비스 테스트`, `참가자 Entity·Repository`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `DB 설정·마이그레이션` be split into smaller, more focused modules?**
  _Cohesion score 0.10188261351052048 - nodes in this community are weakly interconnected._
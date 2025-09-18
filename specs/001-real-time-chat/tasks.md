# Tasks: Real-time Chat System

**Input**: Design documents from `/specs/001-real-time-chat/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: Node.js, Socket.io, PostgreSQL, Redis
   → Structure: Web application (backend + frontend)
2. Load optional design documents: ✓
   → data-model.md: User, Message, ChatRoom, PresenceStatus entities
   → contracts/: REST API and WebSocket events contracts
   → research.md: Technology decisions and patterns
   → quickstart.md: User scenarios for validation
3. Generate tasks by category: ✓
   → Setup: Backend/frontend projects, database, services
   → Tests: Contract tests, WebSocket tests, integration tests
   → Core: Models, services, API endpoints, WebSocket handlers
   → Integration: Database connections, authentication, real-time features
   → Polish: Performance optimization, error handling, documentation
4. Apply task rules: ✓
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness: ✓
   → All contracts have tests
   → All entities have models
   → All endpoints implemented
9. Return: SUCCESS (tasks ready for execution) ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/` (per plan.md structure)
- Database: PostgreSQL with Redis for caching/presence

## Phase 3.1: Setup

- [ ] T001 Create backend project structure with package.json and TypeScript config in `backend/`
- [ ] T002 Create frontend project structure with React and package.json in `frontend/`
- [ ] T003 [P] Configure ESLint and Prettier for backend in `backend/.eslintrc.js`
- [ ] T004 [P] Configure ESLint and Prettier for frontend in `frontend/.eslintrc.js`
- [ ] T005 Setup PostgreSQL database schema from data-model.md in `backend/migrations/001_initial_schema.sql`
- [ ] T006 Configure Redis connection and setup in `backend/src/config/redis.js`
- [ ] T007 Install backend dependencies: express, socket.io, pg, redis, jwt, bcrypt
- [ ] T008 Install frontend dependencies: react, socket.io-client, axios
- [ ] T009 [P] Configure Jest testing framework for backend in `backend/jest.config.js`
- [ ] T010 [P] Configure Jest testing framework for frontend in `frontend/jest.config.js`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### REST API Contract Tests
- [ ] T011 [P] Contract test POST /api/auth/register in `backend/tests/contract/test_auth_register.test.js`
- [ ] T012 [P] Contract test POST /api/auth/login in `backend/tests/contract/test_auth_login.test.js`
- [ ] T013 [P] Contract test GET /api/rooms in `backend/tests/contract/test_rooms_get.test.js`
- [ ] T014 [P] Contract test POST /api/rooms in `backend/tests/contract/test_rooms_post.test.js`
- [ ] T015 [P] Contract test GET /api/rooms/{id}/messages in `backend/tests/contract/test_messages_get.test.js`
- [ ] T016 [P] Contract test GET /api/rooms/{id}/members in `backend/tests/contract/test_room_members.test.js`

### WebSocket Event Tests
- [ ] T017 [P] WebSocket connection test in `backend/tests/websocket/test_connection.test.js`
- [ ] T018 [P] WebSocket join_room event test in `backend/tests/websocket/test_join_room.test.js`
- [ ] T019 [P] WebSocket send_message event test in `backend/tests/websocket/test_send_message.test.js`
- [ ] T020 [P] WebSocket presence events test in `backend/tests/websocket/test_presence.test.js`
- [ ] T021 [P] WebSocket typing indicator test in `backend/tests/websocket/test_typing.test.js`

### Integration Tests
- [ ] T022 [P] User registration and authentication flow test in `backend/tests/integration/test_user_auth_flow.test.js`
- [ ] T023 [P] Real-time message delivery test in `backend/tests/integration/test_realtime_messaging.test.js`
- [ ] T024 [P] Message history persistence test in `backend/tests/integration/test_message_history.test.js`
- [ ] T025 [P] User presence tracking test in `backend/tests/integration/test_presence_tracking.test.js`
- [ ] T026 [P] Multiple chat rooms test in `backend/tests/integration/test_multiple_rooms.test.js`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Database Models
- [ ] T027 [P] User model in `backend/src/models/User.js`
- [ ] T028 [P] Message model in `backend/src/models/Message.js`
- [ ] T029 [P] ChatRoom model in `backend/src/models/ChatRoom.js`
- [ ] T030 [P] RoomMembership model in `backend/src/models/RoomMembership.js`

### Services Layer
- [ ] T031 [P] AuthService with JWT and bcrypt in `backend/src/services/AuthService.js`
- [ ] T032 [P] UserService for CRUD operations in `backend/src/services/UserService.js`
- [ ] T033 [P] MessageService for persistence in `backend/src/services/MessageService.js`
- [ ] T034 [P] RoomService for room management in `backend/src/services/RoomService.js`
- [ ] T035 [P] PresenceService with Redis in `backend/src/services/PresenceService.js`

### REST API Endpoints
- [ ] T036 POST /api/auth/register endpoint in `backend/src/api/auth.js`
- [ ] T037 POST /api/auth/login endpoint in `backend/src/api/auth.js`
- [ ] T038 GET /api/rooms endpoint in `backend/src/api/rooms.js`
- [ ] T039 POST /api/rooms endpoint in `backend/src/api/rooms.js`
- [ ] T040 GET /api/rooms/{id}/messages endpoint in `backend/src/api/rooms.js`
- [ ] T041 GET /api/rooms/{id}/members endpoint in `backend/src/api/rooms.js`
- [ ] T042 POST /api/rooms/{id}/members endpoint in `backend/src/api/rooms.js`

### WebSocket Handlers
- [ ] T043 Socket.io connection handler in `backend/src/websocket/connectionHandler.js`
- [ ] T044 join_room event handler in `backend/src/websocket/roomHandlers.js`
- [ ] T045 leave_room event handler in `backend/src/websocket/roomHandlers.js`
- [ ] T046 send_message event handler in `backend/src/websocket/messageHandlers.js`
- [ ] T047 update_presence event handler in `backend/src/websocket/presenceHandlers.js`
- [ ] T048 typing indicator handlers in `backend/src/websocket/typingHandlers.js`

### Frontend Components
- [ ] T049 [P] LoginForm component in `frontend/src/components/LoginForm.js`
- [ ] T050 [P] ChatRoom component in `frontend/src/components/ChatRoom.js`
- [ ] T051 [P] MessageList component in `frontend/src/components/MessageList.js`
- [ ] T052 [P] MessageInput component in `frontend/src/components/MessageInput.js`
- [ ] T053 [P] UserList component in `frontend/src/components/UserList.js`
- [ ] T054 [P] RoomList component in `frontend/src/components/RoomList.js`

### Frontend Services
- [ ] T055 [P] WebSocket service with Socket.io in `frontend/src/services/WebSocketService.js`
- [ ] T056 [P] API service with Axios in `frontend/src/services/ApiService.js`
- [ ] T057 [P] Auth service for token management in `frontend/src/services/AuthService.js`

## Phase 3.4: Integration

- [ ] T058 Database connection pool setup in `backend/src/config/database.js`
- [ ] T059 JWT authentication middleware in `backend/src/middleware/auth.js`
- [ ] T060 Rate limiting middleware in `backend/src/middleware/rateLimiter.js`
- [ ] T061 CORS configuration in `backend/src/middleware/cors.js`
- [ ] T062 WebSocket authentication middleware in `backend/src/websocket/authMiddleware.js`
- [ ] T063 Error handling middleware in `backend/src/middleware/errorHandler.js`
- [ ] T064 Logging setup with Winston in `backend/src/config/logger.js`
- [ ] T065 Main server setup connecting all components in `backend/src/server.js`
- [ ] T066 Frontend React app integration in `frontend/src/App.js`
- [ ] T067 Frontend routing setup in `frontend/src/components/Router.js`
- [ ] T068 Frontend state management in `frontend/src/context/ChatContext.js`

## Phase 3.5: Polish

### Performance & Optimization
- [ ] T069 [P] Message pagination optimization in `backend/src/services/MessageService.js`
- [ ] T070 [P] Redis caching for room data in `backend/src/services/RoomService.js`
- [ ] T071 [P] Database query optimization and indexes
- [ ] T072 [P] Frontend message virtualization for large histories

### Error Handling & Validation
- [ ] T073 [P] Input validation schemas in `backend/src/validators/schemas.js`
- [ ] T074 [P] WebSocket error handling in `backend/src/websocket/errorHandler.js`
- [ ] T075 [P] Frontend error boundaries in `frontend/src/components/ErrorBoundary.js`
- [ ] T076 [P] Connection retry logic in `frontend/src/services/WebSocketService.js`

### Unit Tests
- [ ] T077 [P] AuthService unit tests in `backend/tests/unit/AuthService.test.js`
- [ ] T078 [P] MessageService unit tests in `backend/tests/unit/MessageService.test.js`
- [ ] T079 [P] PresenceService unit tests in `backend/tests/unit/PresenceService.test.js`
- [ ] T080 [P] Frontend component unit tests in `frontend/tests/components/`

### Documentation & Validation
- [ ] T081 [P] API documentation update in `docs/api.md`
- [ ] T082 [P] WebSocket events documentation in `docs/websocket.md`
- [ ] T083 Run quickstart validation scenarios from `specs/001-real-time-chat/quickstart.md`
- [ ] T084 Performance testing for 50+ concurrent users
- [ ] T085 Security audit for authentication and rate limiting

## Dependencies

### Critical Path
- Setup (T001-T010) before all other phases
- Tests (T011-T026) before implementation (T027-T068)
- Models (T027-T030) before Services (T031-T035)
- Services before API endpoints (T036-T042) and WebSocket handlers (T043-T048)
- Backend core before Frontend (T049-T057)
- Integration (T058-T068) after core implementation
- Polish (T069-T085) after integration complete

### Specific Dependencies
- T027-T030 (models) block T031-T035 (services)
- T031-T035 (services) block T036-T042 (API) and T043-T048 (WebSocket)
- T058 (database) blocks T065 (server setup)
- T059 (auth middleware) blocks T062 (WebSocket auth)
- T055-T057 (frontend services) block T066-T068 (frontend integration)

## Parallel Execution Examples

### Phase 3.2 - Contract Tests (can run all in parallel)
```bash
# Launch T011-T016 together (REST API tests):
Task: "Contract test POST /api/auth/register in backend/tests/contract/test_auth_register.test.js"
Task: "Contract test POST /api/auth/login in backend/tests/contract/test_auth_login.test.js"
Task: "Contract test GET /api/rooms in backend/tests/contract/test_rooms_get.test.js"
Task: "Contract test POST /api/rooms in backend/tests/contract/test_rooms_post.test.js"
Task: "Contract test GET /api/rooms/{id}/messages in backend/tests/contract/test_messages_get.test.js"
Task: "Contract test GET /api/rooms/{id}/members in backend/tests/contract/test_room_members.test.js"
```

### Phase 3.3 - Models (can run all in parallel)
```bash
# Launch T027-T030 together (database models):
Task: "User model in backend/src/models/User.js"
Task: "Message model in backend/src/models/Message.js"
Task: "ChatRoom model in backend/src/models/ChatRoom.js"
Task: "RoomMembership model in backend/src/models/RoomMembership.js"
```

### Phase 3.3 - Frontend Components (can run all in parallel after backend services)
```bash
# Launch T049-T054 together (React components):
Task: "LoginForm component in frontend/src/components/LoginForm.js"
Task: "ChatRoom component in frontend/src/components/ChatRoom.js"
Task: "MessageList component in frontend/src/components/MessageList.js"
Task: "MessageInput component in frontend/src/components/MessageInput.js"
Task: "UserList component in frontend/src/components/UserList.js"
Task: "RoomList component in frontend/src/components/RoomList.js"
```

## Notes
- [P] tasks target different files with no dependencies
- Verify ALL tests fail before implementing (TDD requirement)
- Commit after completing each task or logical group
- Focus on real-time messaging performance (<200ms delivery)
- Implement comprehensive error handling for WebSocket connections

## Task Generation Rules Applied

1. **From Contracts**:
   - REST API endpoints → 6 contract test tasks [P] (T011-T016)
   - WebSocket events → 5 WebSocket test tasks [P] (T017-T021)

2. **From Data Model**:
   - 4 entities → 4 model creation tasks [P] (T027-T030)
   - Services layer → 5 service tasks [P] (T031-T035)

3. **From User Stories**:
   - Quickstart scenarios → 5 integration tests [P] (T022-T026)
   - Validation → quickstart execution task (T083)

4. **Ordering Applied**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - TDD: All tests before any implementation
   - Dependencies enforced within phases

## Validation Checklist
*GATE: Checked before execution*

- [x] All contracts have corresponding tests (T011-T021)
- [x] All entities have model tasks (T027-T030)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (different files marked [P])
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Real-time messaging requirements addressed
- [x] Performance targets specified (<200ms, 50+ users)
- [x] Security and authentication included

---

**Tasks Ready**: 85 total tasks generated from design documents
**Estimated Timeline**: 4-6 weeks for full implementation
**Next Step**: Begin with Phase 3.1 setup tasks
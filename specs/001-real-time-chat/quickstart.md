# Quickstart Guide: Real-time Chat System

**Feature**: Real-time chat system with message history and user presence
**Date**: 2025-09-17

## Overview
This quickstart guide validates the core user scenarios from the feature specification through step-by-step testing scenarios. Each scenario represents a key acceptance criteria that must pass for successful implementation.

## Prerequisites
- Development environment running with:
  - Node.js backend server on port 3000
  - PostgreSQL database with chat schema
  - Redis server for presence management
  - Frontend application accessible at localhost:3001
- Test user accounts created:
  - alice@example.com / password123
  - bob@example.com / password123
  - charlie@example.com / password123

## Test Scenario 1: User Registration and Authentication

### Objective
Verify users can create accounts and authenticate to access the chat system.

### Steps
1. **Registration**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "password123"
     }'
   ```
   **Expected**: 201 status with JWT token and user object

2. **Login**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```
   **Expected**: 200 status with JWT token

3. **Token Validation**:
   ```bash
   curl -X GET http://localhost:3000/api/rooms \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
   **Expected**: 200 status with rooms list

### Success Criteria
- ✅ User can register with valid credentials
- ✅ User can login with correct email/password
- ✅ JWT token allows access to protected endpoints
- ✅ Invalid credentials return 401 errors

## Test Scenario 2: Real-time Message Delivery

### Objective
Verify messages are delivered instantly to all online participants.

### Steps
1. **Setup WebSocket Connections**:
   - Open 3 browser tabs/windows to `http://localhost:3001`
   - Login as alice, bob, and charlie in separate tabs
   - All users join the "General" chat room

2. **Send Message from Alice**:
   - Alice types: "Hello everyone!"
   - Alice presses Send button

3. **Verify Real-time Delivery**:
   - **Expected in Bob's window**: Message appears immediately (<2 seconds)
   - **Expected in Charlie's window**: Message appears immediately (<2 seconds)
   - **Expected message format**:
     ```
     Alice: Hello everyone!
     [timestamp: just now]
     ```

4. **Send Rapid Messages**:
   - Bob sends: "Hi Alice!"
   - Charlie sends: "Hey there!"
   - Alice sends: "How's everyone doing?"

### Success Criteria
- ✅ Messages appear in real-time for all connected users
- ✅ Message delivery time < 2 seconds
- ✅ Messages display correct author and timestamp
- ✅ Multiple rapid messages maintain correct order

## Test Scenario 3: Message History Persistence

### Objective
Verify users can view conversation history when joining or returning to chat.

### Steps
1. **Create Message History**:
   - Alice, Bob, Charlie exchange 10+ messages in "General" room
   - Charlie disconnects/closes browser tab

2. **Charlie Reconnects**:
   - Charlie opens new browser tab and logs in
   - Charlie joins "General" room

3. **Verify History Display**:
   - **Expected**: Charlie sees recent conversation history
   - **Expected**: Messages show correct chronological order
   - **Expected**: All authors and timestamps preserved

4. **API History Access**:
   ```bash
   curl -X GET "http://localhost:3000/api/rooms/general/messages?limit=20" \
     -H "Authorization: Bearer CHARLIE_JWT_TOKEN"
   ```
   **Expected**: JSON response with message array in chronological order

### Success Criteria
- ✅ Users see message history when joining rooms
- ✅ History maintains correct chronological order
- ✅ Message metadata (author, timestamp) preserved
- ✅ API provides paginated access to history

## Test Scenario 4: User Presence Tracking

### Objective
Verify system tracks and displays user online/offline status accurately.

### Steps
1. **Initial Presence Check**:
   - Alice and Bob are online in "General" room
   - Verify participant list shows both as "online"

2. **User Activity Status**:
   - Alice remains active (sending messages)
   - Bob goes idle (no activity for 5+ minutes)
   - **Expected**: Bob's status changes to "away" after timeout

3. **Disconnection Handling**:
   - Bob closes browser tab/disconnects
   - **Expected**: Alice sees "Bob left the room" notification
   - **Expected**: Participant list removes Bob

4. **Reconnection**:
   - Bob reopens browser and rejoins room
   - **Expected**: Alice sees "Bob joined the room" notification
   - **Expected**: Bob appears as "online" in participant list

### Success Criteria
- ✅ Online users visible in participant list
- ✅ Status changes (online → away → offline) tracked accurately
- ✅ Join/leave notifications sent to room members
- ✅ Presence persists across browser refreshes

## Test Scenario 5: Multiple Chat Rooms

### Objective
Verify users can participate in multiple rooms simultaneously.

### Steps
1. **Create Multiple Rooms**:
   ```bash
   # Create "Random" room
   curl -X POST http://localhost:3000/api/rooms \
     -H "Authorization: Bearer ALICE_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Random",
       "type": "public",
       "description": "Random discussions"
     }'
   ```

2. **Multi-room Participation**:
   - Alice joins both "General" and "Random" rooms
   - Bob stays in "General" only
   - Charlie joins "Random" only

3. **Cross-room Messaging**:
   - Alice sends message in "General": "Hello General room!"
   - Alice sends message in "Random": "Hello Random room!"
   - **Expected**: Bob sees only "General" message
   - **Expected**: Charlie sees only "Random" message

4. **Room Switching**:
   - Alice switches active room from "General" to "Random"
   - **Expected**: Alice's presence updates in both rooms
   - **Expected**: Message history loads for "Random" room

### Success Criteria
- ✅ Users can join multiple rooms
- ✅ Messages isolated to specific rooms
- ✅ Presence tracked per room accurately
- ✅ Room switching works smoothly

## Test Scenario 6: Error Handling and Edge Cases

### Objective
Verify system handles error conditions gracefully.

### Steps
1. **Invalid Message Content**:
   - Try sending empty message
   - Try sending message >2000 characters
   - **Expected**: Validation errors, no message sent

2. **Network Interruption**:
   - Alice sends message
   - Temporarily disconnect Alice's network
   - Reconnect Alice's network
   - **Expected**: Alice reconnects automatically
   - **Expected**: Message history syncs on reconnection

3. **Rate Limiting**:
   - Send 50+ messages rapidly from one user
   - **Expected**: Rate limiting kicks in
   - **Expected**: Error message displayed to user

4. **Unauthorized Access**:
   ```bash
   # Try accessing without token
   curl -X GET http://localhost:3000/api/rooms
   ```
   **Expected**: 401 Unauthorized response

### Success Criteria
- ✅ Input validation prevents invalid messages
- ✅ Network interruptions handled gracefully
- ✅ Rate limiting protects against spam
- ✅ Authentication enforced on all endpoints

## Performance Validation

### Objective
Verify system meets performance requirements under load.

### Concurrent Users Test
1. **Setup**: 50 simulated users connect simultaneously
2. **Load**: Each user sends 1 message per second for 1 minute
3. **Measure**: Message delivery latency and system stability
4. **Expected**: <200ms average delivery time, no dropped messages

### Database Performance Test
1. **Setup**: 10,000 existing messages in database
2. **Load**: Request message history from multiple users
3. **Measure**: API response time for history queries
4. **Expected**: <500ms response time for paginated history

### Success Criteria
- ✅ System supports 50+ concurrent users
- ✅ Message delivery <200ms under load
- ✅ Database queries perform adequately
- ✅ No memory leaks or connection issues

## Deployment Validation

### Environment Setup Check
```bash
# Verify all services running
docker ps
# Should show: postgres, redis, backend, frontend containers

# Check database connectivity
psql -h localhost -U chat_user -d chat_db -c "SELECT COUNT(*) FROM users;"

# Check Redis connectivity
redis-cli ping
# Should return: PONG

# Verify backend health
curl http://localhost:3000/health
# Should return: {"status": "healthy"}
```

### Production Readiness
- ✅ All services start successfully
- ✅ Database migrations applied
- ✅ Environment variables configured
- ✅ Logging and monitoring active
- ✅ Security headers implemented

## Troubleshooting Guide

### Common Issues
1. **WebSocket connection fails**:
   - Check JWT token validity
   - Verify CORS configuration
   - Check network connectivity

2. **Messages not appearing**:
   - Verify user in correct room
   - Check WebSocket connection status
   - Review server logs for errors

3. **Presence not updating**:
   - Verify Redis connectivity
   - Check TTL configuration
   - Review presence update logic

### Debug Commands
```bash
# Check WebSocket connections
netstat -an | grep 3000

# Monitor Redis presence data
redis-cli keys "presence:*"

# Check database connections
SELECT * FROM pg_stat_activity WHERE datname = 'chat_db';
```

---

**Quickstart Complete**: All scenarios passed ✅
**Ready for**: Production deployment and user acceptance testing
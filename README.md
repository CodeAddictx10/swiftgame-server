# SwiftGame Backend

## ⚙️ Tech Stack

- **NestJS** – Structured, scalable server framework
- **JWT** – Stateless user authentication
- **Socket.IO** – Real-time communication
- **@nestjs/websockets && @nestjs/platform-io** – WebSocket support
- **Prisma** – ORM for DB operations with Sqlite.
- **Scheduler** – Runs session intervals

## 🕹 Game Session Logic

### Game Loop
Every 40 seconds, a new session is started **if there are at least one connected client**. Each session lasts for 30 seconds.

### Session Flow
1. A new game session is created and marked as active.
2. All connected clients get a `sessionStarted` event via WebSocket.
3. Players can join and pick a number (1–10) during this period.
4. After 30 seconds, the session ends:
   - A winning number is chosen.
   - All users who guessed it correctly are marked as winners.
   - `sessionEvents` event is broadcasted with type of:
      - `sessionStarted`: Emit when a new session starts
      - `sessionInit`: When a new user just got connected to the websocket
      - `sessionEnded`: Emit when a session ends
   - If a game has participants, The below events are also broadcasted to the participants alone using Socket room.
      - `gameSessionJoined`: when a player joined a session
      - `gameSessionJoinError`: if an error other while trying to join the session (this is only broadcast to the user)
      -  `participantEnteredGameSession`: this event inform other players about the new joiner
      - `currentGameSessionEnded`: when a session ends, this is only sends to the session room
5. The session is then cleaned up and removed from memory.

### Old Session Cleanup
Periodic job (`@Interval`) clears old sessions which no players from the DB .

## 📡 Socket Gateway

### Connection Auth
Clients must provide a valid JWT token to connect.

### Session Events
- **`sessionInit`**: Sent on connect (shows current or upcoming session).
- **`joinGameSession`**: Allows users to join if the session is still open.
- **`selectNumberInGameSession`**: Records the number chosen.

### Real-Time Updates

- All relevant game updates are sent via WebSocket events.
- Clients in a session get live participant updates and final results.

## 🛡 Auth
The api endpoint are all protected by default by using a global auth guard. For non-protected routes (login and leaderboard), a `Public Decorator` is added to the controller
### TLDR
- Simple JWT auth based on username input.
- User info is stored in DB.
- Added global app guard
- Verified during WebSocket handshake.

## 🔁 Key Timing

- **SESSION_INTERVAL**: 40s (session loop)
- **GAME_DURATION**: 30s (active session time)
- Remaining 10s is buffer until next session starts.

## Setup
1. Clone git repo
2. Run
```
pnpm install
pnpm run start:dev
```
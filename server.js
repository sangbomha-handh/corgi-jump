const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://hmrgame.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST'],
  }
});

// Serve static files
app.use(express.static(__dirname));

// ── Room management ──
const rooms = {};
let roomCounter = 0;

function generateRoomId() {
  return 'room_' + (++roomCounter) + '_' + Date.now().toString(36);
}

function getRoomList() {
  return Object.entries(rooms).map(([id, room]) => ({
    id,
    title: room.title,
    playerCount: room.players.length,
    maxPlayers: 2,
    status: room.status,
  })).filter(r => r.status !== 'playing');
}

function broadcastRoomList() {
  io.to('lobby').emit('roomList', getRoomList());
}

function broadcastRoomUpdate(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const data = {
    id: roomId,
    title: room.title,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      isHost: p.id === room.hostId,
      corgi: p.corgi,
      human: p.human,
    })),
    hostId: room.hostId,
  };
  io.to(roomId).emit('roomUpdate', data);
}

// ── Socket.io ──
io.on('connection', (socket) => {
  let playerName = '플레이어' + Math.floor(Math.random() * 9000 + 1000);
  let currentRoom = null;

  // Join lobby on connect
  socket.join('lobby');

  // Send initial data
  socket.emit('welcome', { name: playerName });
  socket.emit('roomList', getRoomList());

  // Set nickname
  socket.on('setName', (name) => {
    playerName = (name || '').trim().slice(0, 12) || playerName;
    socket.emit('nameUpdated', playerName);
  });

  // Create room
  socket.on('createRoom', (title) => {
    if (currentRoom) return;
    const roomId = generateRoomId();
    rooms[roomId] = {
      title: (title || '').trim().slice(0, 20) || playerName + '의 방',
      players: [{
        id: socket.id,
        name: playerName,
        ready: false,
        corgi: 1,
        human: 1,
      }],
      hostId: socket.id,
      status: 'waiting',
    };
    currentRoom = roomId;
    socket.leave('lobby');
    socket.join(roomId);
    socket.emit('joinedRoom', roomId);
    broadcastRoomUpdate(roomId);
    broadcastRoomList();
  });

  // Join room
  socket.on('joinRoom', (roomId) => {
    if (currentRoom) return;
    const room = rooms[roomId];
    if (!room || room.players.length >= 2 || room.status !== 'waiting') {
      socket.emit('joinError', '방에 입장할 수 없습니다.');
      return;
    }
    room.players.push({
      id: socket.id,
      name: playerName,
      ready: false,
      corgi: 1,
      human: 1,
    });
    currentRoom = roomId;
    socket.leave('lobby');
    socket.join(roomId);
    socket.emit('joinedRoom', roomId);
    broadcastRoomUpdate(roomId);
    broadcastRoomList();
  });

  // Toggle ready
  socket.on('toggleReady', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const player = room.players.find(p => p.id === socket.id);
    if (player && player.id !== room.hostId) {
      player.ready = !player.ready;
      broadcastRoomUpdate(currentRoom);
    }
  });

  // Update character selection
  socket.on('selectChar', ({ corgi, human }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      if (corgi) player.corgi = corgi;
      if (human) player.human = human;
      broadcastRoomUpdate(currentRoom);
    }
  });

  // Chat message
  socket.on('chatMsg', (msg) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const text = (msg || '').trim().slice(0, 100);
    if (!text) return;
    io.to(currentRoom).emit('chatMsg', { name: playerName, text });
  });

  // Start game (host only)
  socket.on('startGame', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (room.hostId !== socket.id) return;
    if (room.players.length < 2) return;
    const otherPlayer = room.players.find(p => p.id !== socket.id);
    if (!otherPlayer || !otherPlayer.ready) return;

    room.status = 'playing';

    // Generate shared seed for platform generation
    const seed = Math.floor(Math.random() * 1000000);
    io.to(currentRoom).emit('gameStart', {
      seed,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        corgi: p.corgi,
        human: p.human,
      })),
    });
    broadcastRoomList();
  });

  // In-game position sync
  socket.on('gameState', (state) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('opponentState', {
      id: socket.id,
      ...state,
    });
  });

  // Game over
  socket.on('playerDied', (finalScore) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('opponentDied', { id: socket.id, score: finalScore });
  });

  // Leave room
  socket.on('leaveRoom', () => {
    leaveCurrentRoom();
  });

  // Refresh room list
  socket.on('refreshRooms', () => {
    socket.emit('roomList', getRoomList());
  });

  // Disconnect
  socket.on('disconnect', () => {
    leaveCurrentRoom();
  });

  function leaveCurrentRoom() {
    if (!currentRoom || !rooms[currentRoom]) {
      currentRoom = null;
      return;
    }
    const room = rooms[currentRoom];
    room.players = room.players.filter(p => p.id !== socket.id);
    socket.leave(currentRoom);

    if (room.players.length === 0) {
      delete rooms[currentRoom];
    } else {
      // Transfer host if needed
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
        room.players[0].ready = false;
      }
      room.status = 'waiting';
      broadcastRoomUpdate(currentRoom);
    }
    currentRoom = null;
    socket.join('lobby');
    broadcastRoomList();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Corgi Jump server running on http://localhost:${PORT}`);
});

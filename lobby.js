// ── Lobby client (Socket.io) ──
let socket = null;
let myName = '';
let mySocketId = '';
let currentRoomId = null;
let isHost = false;
let multiplayerGameData = null; // set when game starts

function loadSocketIO(callback) {
  if (typeof io !== 'undefined') { callback(); return; }
  const serverUrl = window.MULTIPLAYER_SERVER || '';
  if (!serverUrl) { alert('멀티플레이 서버가 설정되지 않았습니다.'); return; }
  const script = document.createElement('script');
  script.src = serverUrl + '/socket.io/socket.io.js';
  script.onload = callback;
  script.onerror = () => { alert('서버에 연결할 수 없습니다.'); };
  document.head.appendChild(script);
}

function connectToServer() {
  if (socket && socket.connected) return;
  const serverUrl = window.MULTIPLAYER_SERVER || '';
  loadSocketIO(() => {
    if (typeof io === 'undefined') return;
    socket = serverUrl ? io(serverUrl) : io();

  socket.on('connect', () => {
    mySocketId = socket.id;
  });

  socket.on('welcome', (data) => {
    myName = data.name;
    document.getElementById('nick-input').value = myName;
  });

  socket.on('nameUpdated', (name) => {
    myName = name;
    document.getElementById('nick-input').value = myName;
  });

  socket.on('roomList', (rooms) => {
    renderRoomList(rooms);
  });

  socket.on('joinedRoom', (roomId) => {
    currentRoomId = roomId;
    showSection('section-room');
    document.getElementById('chat-box').innerHTML = '';
  });

  socket.on('joinError', (msg) => {
    alert(msg);
  });

  socket.on('roomUpdate', (data) => {
    renderWaitingRoom(data);
  });

  socket.on('chatMsg', (data) => {
    appendChat(data.name, data.text);
  });

  socket.on('gameStart', (data) => {
    multiplayerGameData = data;
    hideLobby();
    startMultiplayerGame(data);
  });

  socket.on('opponentState', (state) => {
    if (typeof updateOpponent === 'function') {
      updateOpponent(state);
    }
  });

  socket.on('opponentDied', (data) => {
    if (typeof onOpponentDied === 'function') {
      onOpponentDied(data);
    }
  });
  }); // end loadSocketIO callback
}

// ── UI Rendering ──
function renderRoomList(rooms) {
  const container = document.getElementById('room-list');
  if (rooms.length === 0) {
    container.innerHTML = '<div class="room-empty">생성된 방이 없습니다</div>';
    return;
  }
  container.innerHTML = rooms.map(r => `
    <div class="room-card" onclick="joinRoom('${r.id}')">
      <div class="room-info">
        <h3>${escapeHtml(r.title)}</h3>
        <span>${r.playerCount}/${r.maxPlayers}명</span>
      </div>
      <button class="room-join-btn">입장</button>
    </div>
  `).join('');
}

function renderWaitingRoom(data) {
  document.getElementById('room-title-display').textContent = data.title || '대기방';

  const me = data.players.find(p => p.id === mySocketId);
  isHost = me && me.isHost;

  for (let i = 0; i < 2; i++) {
    const slot = document.getElementById('slot-' + i);
    const p = data.players[i];
    if (p) {
      let statusHtml;
      if (p.isHost) {
        statusHtml = '<span class="slot-status host">방장</span>';
      } else if (p.ready) {
        statusHtml = '<span class="slot-status ready">준비 완료</span>';
      } else {
        statusHtml = '<span class="slot-status waiting">대기 중</span>';
      }
      slot.innerHTML = `
        <div class="slot-name">${escapeHtml(p.name)}</div>
        ${statusHtml}
      `;
    } else {
      slot.innerHTML = '<div class="slot-empty">대기 중...</div>';
    }
  }

  // Show/hide buttons
  const readyBtn = document.getElementById('ready-btn');
  const startBtn = document.getElementById('start-btn');

  if (isHost) {
    readyBtn.style.display = 'none';
    const otherReady = data.players.length === 2 && data.players.find(p => !p.isHost && p.ready);
    startBtn.style.display = 'block';
    startBtn.disabled = !otherReady;
    startBtn.style.opacity = otherReady ? '1' : '0.5';
  } else {
    startBtn.style.display = 'none';
    readyBtn.style.display = 'block';
    if (me && me.ready) {
      readyBtn.textContent = '준비 취소';
      readyBtn.className = 'lobby-btn btn-gray';
    } else {
      readyBtn.textContent = '준비';
      readyBtn.className = 'lobby-btn btn-blue';
    }
  }
}

function appendChat(name, text) {
  const box = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<b>${escapeHtml(name)}</b>: ${escapeHtml(text)}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Lobby Actions ──
function showLobby() {
  connectToServer();
  document.getElementById('lobby-overlay').classList.add('active');
  showSection('section-lobby');
  if (socket) socket.emit('refreshRooms');
}

function hideLobby() {
  document.getElementById('lobby-overlay').classList.remove('active');
}

function joinRoom(roomId) {
  if (socket) socket.emit('joinRoom', roomId);
}

function backToLobbyFromRoom() {
  if (socket) socket.emit('leaveRoom');
  currentRoomId = null;
  showSection('section-lobby');
  socket.emit('refreshRooms');
}

function backToTitleFromLobby() {
  hideLobby();
  currentRoomId = null;
}

// ── Event Listeners ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nick-btn').addEventListener('click', () => {
    const name = document.getElementById('nick-input').value.trim();
    if (name && socket) socket.emit('setName', name);
  });

  document.getElementById('create-room-btn').addEventListener('click', () => {
    const title = document.getElementById('room-title-input').value.trim();
    if (socket) socket.emit('createRoom', title);
    document.getElementById('room-title-input').value = '';
  });

  document.getElementById('refresh-btn').addEventListener('click', () => {
    if (socket) socket.emit('refreshRooms');
  });

  document.getElementById('back-to-title-btn').addEventListener('click', () => {
    backToTitleFromLobby();
  });

  document.getElementById('ready-btn').addEventListener('click', () => {
    if (socket) socket.emit('toggleReady');
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    if (socket) socket.emit('startGame');
  });

  document.getElementById('leave-room-btn').addEventListener('click', () => {
    backToLobbyFromRoom();
  });

  document.getElementById('chat-send-btn').addEventListener('click', sendChat);
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });
});

function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (text && socket) {
    socket.emit('chatMsg', text);
    input.value = '';
  }
}

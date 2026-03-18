const { createServer } = require('http');
const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const { GameRoom } = require('./GameRoom');

const app = express();
const httpServer = createServer(app);

// Servir a versão de produção do jogo (Pasta dist)
app.use(express.static(path.join(__dirname, '../dist')));

// Endpoint de saúde da máquina e estatísticas
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size || 0, uptime: process.uptime() });
});

// Qualquer outra página que não seja um arquivo, devolve o React Router (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // Otimizações de performance (Tolerância alta para a AMD Micro)
  pingInterval: 25000,
  pingTimeout: 60000
});

const rooms = new Map(); // roomId → GameRoom

const DEFAULT_ROOM = 'global';

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    console.log(`[Room] Criando sala: ${roomId}`);
    rooms.set(roomId, new GameRoom(roomId, io));
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  console.log(`[+] Jogador conectado: ${socket.id}`);

  socket.on('join', ({ name, skinColor, skinType, roomId = DEFAULT_ROOM }) => {
    try {
      const room = getOrCreateRoom(roomId);
      const { snake, orbs } = room.addPlayer(socket.id, name || 'Anônimo', skinColor || '#39ff14', skinType || 'cyclops');
      socket.join(roomId);
      socket.data.roomId = roomId;

      // Confirm join and send initial world state
      socket.emit('joined', {
        playerId: socket.id,
        orbs,
        worldSize: 6000
      });

      console.log(`[Room ${roomId}] ${name} entrou. Total: ${room.players.size} jogadores.`);
    } catch (err) {
      console.error('[join error]', err);
    }
  });

  // Recebe input do jogador (somente direção e boost — nunca confiar na posição do cliente)
  socket.on('input', (input) => {
    const room = rooms.get(socket.data.roomId);
    if (room) room.updateInput(socket.id, input);
  });

  // Ping/pong for latency measurement
  socket.on('ping_check', (clientTime) => {
    socket.emit('pong_check', clientTime);
  });

  socket.on('disconnect', (reason) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (room) {
      room.removePlayer(socket.id);
      console.log(`[-] ${socket.id} saiu da sala ${roomId}. Motivo: ${reason}`);
      // Limpa sala vazia
      if (room.isEmpty) {
        setTimeout(() => {
          if (room.isEmpty) {
            room.destroy();
            rooms.delete(roomId);
            console.log(`[Room] Sala ${roomId} destruída (vazia).`);
          }
        }, 30000); // aguarda 30s antes de destruir
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🌊 Ocean.io Server rodando na porta ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

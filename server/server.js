// server.js – Entry point do servidor Socket.io
const { createServer } = require('http');
const { Server } = require('socket.io');
const { GameRoom } = require('./GameRoom');

const httpServer = createServer((req, res) => {
  // Health check endpoint for Railway
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, uptime: process.uptime() }));
    return;
  }
  res.writeHead(200);
  res.end('Ocean.io Game Server is running 🌊');
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // Otimizações de performance
  pingInterval: 10000,
  pingTimeout: 5000
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

  socket.on('join', ({ name, skinColor, roomId = DEFAULT_ROOM }) => {
    try {
      const room = getOrCreateRoom(roomId);
      const { snake, orbs } = room.addPlayer(socket.id, name || 'Anônimo', skinColor || '#39ff14');
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

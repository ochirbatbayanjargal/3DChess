const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// Game state
let players = [];
const maxPlayers = 2;

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);
    
    // Check if game is full
    if (players.length >= maxPlayers) {
        socket.emit('game-full');
        socket.disconnect();
        return;
    }
    
    // Assign color to player
    let playerColor = players.length === 0 ? 'white' : 'black';
    players.push({
        id: socket.id,
        color: playerColor
    });
    
    // Notify player of their color and if the game can start
    socket.emit('player-assigned', {
        color: playerColor,
        opponentConnected: players.length === maxPlayers
    });
    
    // Notify other player if game can start
    if (players.length === maxPlayers) {
        socket.broadcast.emit('opponent-connected');
    }
    
    // Handle move
    socket.on('make-move', (data) => {
        socket.broadcast.emit('move-made', data);
    });
    
    // Handle game reset
    socket.on('reset-game', () => {
        io.emit('game-reset');
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        // Remove player from array
        players = players.filter(player => player.id !== socket.id);
        
        // Notify remaining player
        io.emit('opponent-disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play`);
});
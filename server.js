const path = require('path');
const http = require('http');
const dotenv = require('dotenv');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

dotenv.config({ path: './config.env' }); // accessing the config.env file globally

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatUp Bot';

// Run when a client connects
io.on('connection', (socket) => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit(
      'message',
      formatMessage(
        botName,
        'WARNING! THIS IS JUST A PROTOYPE APP SO DO NOT WRITE OR SEND ANY IMPORTANT INFORMATION'
      )
    );
    socket.emit(
      'message',
      formatMessage(botName, `You are now in ${user.room} room`)
    );
    socket.emit('message', formatMessage(botName, 'Welcome to chat'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen to chat message
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );
      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT | 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

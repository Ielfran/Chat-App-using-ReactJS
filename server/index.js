   const express = require('express');
   const http = require('http');
   const { Server } = require('socket.io');
   const cors = require('cors');
   const mongoose = require('mongoose');
   const dotenv = require('dotenv');
   const { v4: uuidv4 } = require('uuid');
   const Message = require('./models/Message');

   dotenv.config();

   const app = express();
   app.use(cors());
   app.use(express.json());

   const server = http.createServer(app);
   const io = new Server(server, {
     cors: {
       origin: process.env.CLIENT_ORIGIN,
       methods: ['GET', 'POST'],
     },
   });

   // Connect to MongoDB
   mongoose
     .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
     .then(() => console.log('MongoDB connected'))
     .catch((err) => console.error('MongoDB connection error:', err));

   // Store connected users: { socketId: { id, username, room } }
   const users = {};

   io.on('connection', (socket) => {
     console.log(`User Connected: ${socket.id}`);

     // Handle user joining
     socket.on('join', async ({ username, room }) => {
       if (!username || !room) {
         socket.emit('error', 'Username and room are required');
         return;
       }
       const userId = uuidv4();
       users[socket.id] = { id: userId, username, room };
       socket.join(room);

       // Send recent messages from the database
       const messages = await Message.find({ room })
         .sort({ timestamp: -1 })
         .limit(50);
       socket.emit('chat history', messages.reverse());

       // Broadcast user joined
       socket.to(room).emit('user joined', `${username} has joined the room`);
       io.to(room).emit('user list', Object.values(users).filter((u) => u.room === room));

       console.log(`${username} joined room: ${room}`);
     });

     // Handle chat message
     socket.on('chat message', async ({ message, room, username }) => {
       if (!message.trim() || message.length > 500) {
         socket.emit('error', 'Invalid message');
         return;
       }
       const msg = new Message({ username, message, room });
       await msg.save();
       io.to(room).emit('chat message', { username, message, timestamp: msg.timestamp });
     });

     // Handle typing indicator
     socket.on('typing', ({ username, room }) => {
       socket.to(room).emit('typing', username);
     });

     // Handle stop typing
     socket.on('stop typing', ({ room }) => {
       socket.to(room).emit('stop typing');
     });

     // Handle private message
     socket.on('private message', async ({ toUserId, message, username }) => {
       const recipient = Object.values(users).find((u) => u.id === toUserId);
       if (!recipient) {
         socket.emit('error', 'User not found');
         return;
       }
       const msg = new Message({ username, message, room: `private-${toUserId}` });
       await msg.save();
       socket.to(recipient.socketId).emit('private message', {
         from: username,
         message,
         timestamp: msg.timestamp,
       });
       socket.emit('private message', {
         to: recipient.username,
         message,
         timestamp: msg.timestamp,
       });
     });

     // Handle disconnection
     socket.on('disconnect', () => {
       const user = users[socket.id];
       if (user) {
         socket.to(user.room).emit('user left', `${user.username} has left the room`);
         io.to(user.room).emit(
           'user list',
           Object.values(users).filter((u) => u.room === user.room)
         );
         delete users[socket.id];
         console.log(`${user.username} disconnected`);
       }
     });
   });

   const PORT = process.env.PORT || 4000;
   server.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);
   });

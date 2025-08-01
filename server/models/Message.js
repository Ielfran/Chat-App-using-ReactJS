 const mongoose = require('mongoose');

   const messageSchema = new mongoose.Schema({
     username: { type: String, required: true },
     message: { type: String, required: true },
     room: { type: String, default: 'general' },
     timestamp: { type: Date, default: Date.now },
   });

   module.exports = mongoose.model('Message', messageSchema);


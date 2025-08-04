 import React, { useState } from 'react';

     function UsernamePrompt({ onJoin }) {
       const [username, setUsername] = useState('');
       const [room, setRoom] = useState('general');

       const handleSubmit = (e) => {
         e.preventDefault();
         if (username.trim() && room.trim()) {
           onJoin({ username, room });
         }
       };

       return (
         <div className="username-prompt">
           <h2>Join Chat</h2>
           <form onSubmit={handleSubmit}>
             <input
               type="text"
               placeholder="Enter username"
               value={username}
               onChange={(e) => setUsername(e.target.value)}
             />
             <input
               type="text"
               placeholder="Enter room name"
               value={room}
               onChange={(e) => setRoom(e.target.value)}
             />
             <button type="submit">Join</button>
           </form>
         </div>
       );
     }

     export default UsernamePrompt;


const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const SECRET_CODE = "36"; // Mã bí mật của bạn

io.on('connection', (socket) => {
    socket.on('join-room', (data) => {
        if (data.code === SECRET_CODE) {
            socket.join(SECRET_CODE);
            socket.username = data.username || "Ẩn danh";
            socket.emit('login-success', { name: socket.username });
        } else {
            socket.emit('login-error', 'Sai mã bí mật!');
        }
    });

    socket.on('send-chat', (message) => {
        // Cách lấy phòng an toàn hơn cho Render
        const rooms = Array.from(socket.rooms);
        const room = rooms.find(r => r === SECRET_CODE);
        
        if (room) {
            io.to(room).emit('chat-message', {
                user: socket.username,
                msg: message,
                id: socket.id 
            });
        }
    });
}); // <--- Đây là dấu đóng ngoặc bạn bị thiếu

// Render cần dòng này để chạy trên internet
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Server dang chay tai port: ' + PORT);
});

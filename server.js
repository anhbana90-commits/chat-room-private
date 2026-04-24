const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const SECRET_CODE = "36"; 

io.on('connection', (socket) => {
    // 1. Xử lý khi vào phòng
    socket.on('join-room', (data) => {
        if (data.code === SECRET_CODE) {
            socket.join(SECRET_CODE);
            socket.username = data.username || "Ẩn danh";
            socket.emit('login-success', { name: socket.username });
        } else {
            socket.emit('login-error', 'Sai mã bí mật!');
        }
    });

    // 2. Xử lý gửi tin nhắn
    socket.on('send-chat', (message) => {
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

    // 3. Xử lý khi đang soạn tin (MỚI THÊM)
    socket.on('typing', () => {
        const rooms = Array.from(socket.rooms);
        const room = rooms.find(r => r === SECRET_CODE);
        if (room) {
            // Gửi thông báo cho mọi người TRỪ người đang gõ
            socket.to(room).emit('display-typing', { user: socket.username });
        }
    });

    // 4. Xử lý khi ngừng soạn tin (MỚI THÊM)
    socket.on('stop-typing', () => {
        const rooms = Array.from(socket.rooms);
        const room = rooms.find(r => r === SECRET_CODE);
        if (room) {
            socket.to(room).emit('hide-typing');
        }
    });
}); 

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Server dang chay tai port: ' + PORT);
});

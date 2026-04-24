const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const SECRET_CODE = "36"; 

io.on('connection', (socket) => {
    
    // 1. Xử lý khi người dùng yêu cầu vào phòng
    socket.on('join-room', (data) => {
        if (data.code === SECRET_CODE) {
            socket.join(SECRET_CODE);
            socket.username = data.username || "Ẩn danh";
            
            // Báo cho người đó vào thành công
            socket.emit('login-success', { name: socket.username });

            // THÔNG BÁO CHO CẢ PHÒNG: Có người vừa vào
            io.to(SECRET_CODE).emit('system-message', `${socket.username} đã tham gia phòng`);
        } else {
            socket.emit('login-error', 'Sai mã bí mật!');
        }
    });

    // 2. Xử lý khi gửi tin nhắn chat
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

    // 3. Xử lý trạng thái đang soạn tin
    socket.on('typing', () => {
        const rooms = Array.from(socket.rooms);
        const room = rooms.find(r => r === SECRET_CODE);
        if (room) {
            socket.to(room).emit('display-typing', { user: socket.username });
        }
    });

    socket.on('stop-typing', () => {
        const rooms = Array.from(socket.rooms);
        const room = rooms.find(r => r === SECRET_CODE);
        if (room) {
            socket.to(room).emit('hide-typing');
        }
    });

    // 4. Xử lý khi ai đó thoát (tắt tab, mất mạng)
    socket.on('disconnect', () => {
        if (socket.username) {
            // Thông báo cho những người còn lại
            io.to(SECRET_CODE).emit('system-message', `${socket.username} đã rời phòng`);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Server dang chay tai port: ' + PORT);
});

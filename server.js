const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const SECRET_CODE = "36"; // Đây là mã bạn sẽ đưa cho bạn bè

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

    socket.on('send-chat', (msg) => {
        // Chỉ gửi tin nhắn cho những người cùng nhập đúng mã 2026
        io.to(SECRET_CODE).emit('chat-message', {
            user: socket.username,
            msg: msg
        });
    });
});

http.listen(3000, () => {
    console.log('Server dang chay tai: http://localhost:3000');
});

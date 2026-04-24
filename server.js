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

    // Tìm đoạn này trong server.js và thay thế:
socket.on('send-chat', (message) => {
    const room = Array.from(socket.rooms)[1]; 
    if (room) {
        io.to(room).emit('chat-message', {
            user: socket.username,
            msg: message,
            id: socket.id // Thêm dòng này để phân biệt người gửi
        });
    }
});

http.listen(3000, () => {
    console.log('Server dang chay tai: http://localhost:3000');
});

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// CƠ SỞ DỮ LIỆU PHÒNG: Lưu trữ tất cả phòng đang hoạt động
let allRooms = {
    "sanh-chung": { 
        name: "Sảnh Chung", 
        pass: "", 
        limit: 99, 
        owner: "system", 
        users: [] 
    }
};

io.on('connection', (socket) => {
    console.log('Có kết nối mới:', socket.id);

    // Gửi danh sách phòng cho người mới vào web
    socket.emit('update-room-list', allRooms);

    // 1. Xử lý Tạo phòng mới
    socket.on('create-room', (data) => {
        const { roomID, roomName, roomPass, roomLimit, username } = data;

        if (allRooms[roomID]) {
            return socket.emit('error-msg', 'Mã phòng này đã tồn tại!');
        }

        socket.username = username || "Ẩn danh";

        // Thêm phòng mới vào danh sách
        allRooms[roomID] = {
            name: roomName,
            pass: roomPass,
            limit: parseInt(roomLimit) || 10,
            owner: socket.id,
            users: []
        };

        // Báo cho người tạo biết đã tạo xong để họ tự động Join
        socket.emit('create-success', roomID);
        // Cập nhật danh sách cho tất cả mọi người ở sảnh
        io.emit('update-room-list', allRooms);
    });

    // 2. Xử lý Vào phòng
    socket.on('join-room', (data) => {
        const { roomID, pass, username } = data;
        const room = allRooms[roomID];

        if (!room) return socket.emit('error-msg', 'Phòng không tồn tại!');
        if (room.pass !== "" && room.pass !== pass) return socket.emit('error-msg', 'Sai mật khẩu phòng!');
        if (room.users.length >= room.limit) return socket.emit('error-msg', 'Phòng đã đầy người!');

        // Thiết lập thông tin socket
        socket.username = username || "Ẩn danh";
        socket.currentRoom = roomID;
        
        socket.join(roomID);
        room.users.push(socket.id);

        socket.emit('login-success', { name: socket.username, roomName: room.name });
        
        // Thông báo cho mọi người trong phòng
        io.to(roomID).emit('system-message', `${socket.username} đã tham gia phòng`);
        // Cập nhật lại sĩ số phòng cho những người ngoài sảnh
        io.emit('update-room-list', allRooms);
    });

    // 3. Xử lý Chat (Dùng roomID động)
    socket.on('send-chat', (message) => {
        if (socket.currentRoom) {
            io.to(socket.currentRoom).emit('chat-message', {
                user: socket.username,
                msg: message,
                id: socket.id 
            });
        }
    });

    // 4. Xử lý Soạn tin (Dùng roomID động)
    socket.on('typing', () => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('display-typing', { user: socket.username });
        }
    });

    socket.on('stop-typing', () => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('hide-typing');
        }
    });

    // 5. Xử lý Thoát và Dọn dẹp phòng trống
    socket.on('disconnect', () => {
        const roomID = socket.currentRoom;
        if (roomID && allRooms[roomID]) {
            const room = allRooms[roomID];
            room.users = room.users.filter(id => id !== socket.id);

            io.to(roomID).emit('system-message', `${socket.username} đã rời phòng`);

            // Nếu phòng không phải Sảnh Chung và không còn ai -> Xóa phòng
            if (room.users.length === 0 && roomID !== "sanh-chung") {
                delete allRooms[roomID];
            }

            io.emit('update-room-list', allRooms);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Server Lobby dang chay tai port: ' + PORT);
});

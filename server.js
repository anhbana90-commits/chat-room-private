const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// CƠ SỞ DỮ LIỆU PHÒNG
// Mình thêm sẵn mã "36" để bạn bấm nút là vào được ngay
let allRooms = {
    "sanh-chung": { 
        name: "Sảnh Chung", 
        pass: "", 
        limit: 99, 
        owner: "system", 
        users: [] 
    },
    "36": { 
        name: "Phòng Chat Nhanh (36)", 
        pass: "", 
        limit: 99, 
        owner: "system", 
        users: [] 
    }
};

io.on('connection', (socket) => {
    console.log('Có kết nối mới:', socket.id);

    // 1. Kiểm tra phòng tồn tại (Cho ô tìm kiếm mã phòng)
    socket.on('check-room-exists', (id) => {
        const room = allRooms[id];
        if (room) {
            socket.emit('room-exists-status', { 
                exists: true, 
                id: id, 
                hasPass: room.pass !== "" 
            });
        } else {
            socket.emit('room-exists-status', { exists: false, id: id });
        }
    });

    // 2. Xử lý Tạo phòng mới
    socket.on('create-room', (data) => {
        const { roomID, roomName, roomPass, roomLimit, username } = data;
        
        if (allRooms[roomID]) {
            return socket.emit('error-msg', 'Mã phòng này đã tồn tại!');
        }

        socket.username = username || "Ẩn danh";
        allRooms[roomID] = {
            name: roomName || "Phòng bí mật",
            pass: roomPass || "",
            limit: parseInt(roomLimit) || 10,
            owner: socket.id,
            users: []
        };

        socket.emit('create-success', roomID);
    });

    // 3. Xử lý Vào phòng
    socket.on('join-room', (data) => {
        const { roomID, pass, username } = data;
        const room = allRooms[roomID];

        if (!room) return socket.emit('error-msg', 'Phòng không tồn tại!');
        if (room.pass !== "" && room.pass !== pass) return socket.emit('error-msg', 'Sai mật khẩu!');
        if (room.users.length >= room.limit) return socket.emit('error-msg', 'Phòng đầy!');

        socket.username = username || "Ẩn danh";
        socket.currentRoom = roomID;
        socket.join(roomID);
        
        // Thêm user vào danh sách nếu chưa có
        if (!room.users.includes(socket.id)) {
            room.users.push(socket.id);
        }

        socket.emit('login-success', { 
            name: socket.username, 
            roomName: room.name 
        });

        io.to(roomID).emit('system-message', `${socket.username} đã tham gia.`);
    });

    // 4. Xử lý Chat
    socket.on('send-chat', (message) => {
        if (socket.currentRoom) {
            io.to(socket.currentRoom).emit('chat-message', {
                user: socket.username,
                msg: message,
                id: socket.id 
            });
        }
    });

    // 5. Thông báo đang gõ
    socket.on('typing', () => {
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('display-typing', { user: socket.username });
    });

    socket.on('stop-typing', () => {
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('hide-typing');
    });

    // 6. Xử lý Thoát
    socket.on('disconnect', () => {
        const roomID = socket.currentRoom;
        if (roomID && allRooms[roomID]) {
            const room = allRooms[roomID];
            room.users = room.users.filter(id => id !== socket.id);
            io.to(roomID).emit('system-message', `${socket.username} đã rời phòng.`);

            // Chỉ xóa phòng nếu không phải Sảnh chung hoặc Phòng 36
            if (room.users.length === 0 && roomID !== "sanh-chung" && roomID !== "36") {
                delete allRooms[roomID];
            }
        }
    });
});

// Cấu hình Port cho Render
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Server dang chay tai port: ' + PORT);
});

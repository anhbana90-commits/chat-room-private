const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// CƠ SỞ DỮ LIỆU PHÒNG
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

    // 1. Kiểm tra phòng tồn tại (Dùng cho ô tìm kiếm)
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

    // 2. Xử lý Tạo phòng mới (Đã tối ưu giới hạn 1-99)
    socket.on('create-room', (data) => {
        const { roomID, roomName, roomPass, roomLimit, username } = data;
        
        if (allRooms[roomID]) {
            return socket.emit('error-msg', 'Mã phòng này đã tồn tại!');
        }

        // Kiểm tra giới hạn số người từ 1 đến 99
        let finalLimit = parseInt(roomLimit) || 10;
        if (finalLimit < 1) finalLimit = 1;
        if (finalLimit > 99) finalLimit = 99;

        socket.username = username || "Ẩn danh";
        allRooms[roomID] = {
            name: roomName || "Phòng bí mật",
            pass: roomPass || "",
            limit: finalLimit,
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
        
        // Kiểm tra mật khẩu
        if (room.pass !== "" && room.pass !== pass) {
            return socket.emit('error-msg', 'Sai mật khẩu phòng!');
        }
        
        // Kiểm tra giới hạn người dùng
        if (room.users.length >= room.limit) {
            return socket.emit('error-msg', `Phòng đã đầy! (Tối đa ${room.limit} người)`);
        }

        socket.username = username || "Ẩn danh";
        socket.currentRoom = roomID;
        socket.join(roomID);
        
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

    // 5. Xử lý Trạng thái đang gõ
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

    // 6. Xử lý Thoát/Mất kết nối
    socket.on('disconnect', () => {
        const roomID = socket.currentRoom;
        if (roomID && allRooms[roomID]) {
            const room = allRooms[roomID];
            room.users = room.users.filter(id => id !== socket.id);
            io.to(roomID).emit('system-message', `${socket.username} đã rời phòng.`);

            // Tự động xóa phòng trống (trừ phòng hệ thống)
            if (room.users.length === 0 && roomID !== "sanh-chung" && roomID !== "36") {
                delete allRooms[roomID];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Server đang chạy tại port: ' + PORT);
});

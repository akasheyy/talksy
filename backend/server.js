require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message"); // ✅ import model

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Talksy backend with private chat 🚀");
});

// ✅ Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Create HTTP server & socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // frontend
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  // ✅ Join room for private chats
  socket.on("join_room", async (username) => {
  socket.join(username);
  console.log(`${username} joined their room`);

  // Load previous messages (both sent and received by this user)
  const history = await Message.find({
    $or: [{ sender: username }, { receiver: username }]
  }).sort({ timestamp: 1 });

  socket.emit("load_messages", history);
});


  // ✅ Send message to receiver only
  socket.on("private_message", async (data) => {
    const { sender, receiver, message } = data;

    // Save message in database
    const newMsg = new Message({ sender, receiver, message });
    await newMsg.save();

    // Send only to receiver’s room
    io.to(receiver).emit("receive_message", { sender, message });
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});


const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

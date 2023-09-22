const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    userId: String,
    text: String,
    roomid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const botResponseSchema = new mongoose.Schema(
  {
    userId: String,
    reply: String,
    roomid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const scoreSchema = new mongoose.Schema(
  {
    userId: String,
    score: String,
    roomid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const chatSchema = new mongoose.Schema(
  {
    userId: String,
    chatDate: Date,
    chatTime: String,
    chatDuration: Number,
    chatRoomName: String,
  },
  {
    timestamps: true,
    collection: "chatRooms",
  }
);

const Chat = mongoose.model("Chat", chatSchema);
const Message = mongoose.model("Message", messageSchema);
const BotResponse = mongoose.model("BotResponse", botResponseSchema);
const Score = mongoose.model("Score", scoreSchema);

module.exports = { Chat, Message, BotResponse, Score };

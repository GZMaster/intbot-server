const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    userId: String,
    username: String,
    text: String,
    roomid: String,
  },
  {
    timestamps: true,
  }
);

const botResponseSchema = new mongoose.Schema(
  {
    userId: String,
    reply: String,
    roomid: String,
  },
  {
    timestamps: true,
  }
);

const interviewRoomSchema = new mongoose.Schema(
  {
    userIds: Array,
    interviewDate: Date,
    interviewTime: String,
    interviewDuration: Number,
    interviewRoomName: String,
  },
  {
    timestamps: true,
    collection: "interviewRooms",
  }
);

const InterviewRoom = mongoose.model("InterviewRoom", interviewRoomSchema);
const Message = mongoose.model("Message", messageSchema);
const BotResponse = mongoose.model("BotResponse", botResponseSchema);

module.exports = { InterviewRoom, Message, BotResponse };

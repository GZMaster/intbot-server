// const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const {
  InterviewRoom,
  Message,
  BotResponse,
} = require("../models/InterviewRoomModel");
const { User } = require("../models/userModel");

exports.userJoin = async (token, username, room) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    const interview = await InterviewRoom.findById(room);

    if (!interview) {
      throw new AppError("No interview found with that ID", 404);
    }
    if (!user) {
      throw new AppError("No user found with that ID", 404);
    }
    if (interview.userIds.includes(user._id)) {
      throw new AppError("User already joined", 400);
    }

    interview.userIds.push(user._id);
    await interview.save();
    return { user, interview };
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
};

exports.message = async (token, room, message) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    const interview = await InterviewRoom.findById(room);

    if (!interview) {
      throw new AppError("No interview found with that ID", 404);
    }
    if (!user) {
      throw new AppError("No user found with that ID", 404);
    }
    if (!interview.userIds.includes(user._id)) {
      throw new AppError("User not joined", 400);
    }

    const newMessage = new Message({
      userId: user._id,
      username: user.username,
      text: message,
      roomid: interview._id,
    });

    await newMessage.save();
    return newMessage;
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
};

exports.botResponse = async (token, room, message) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    const interview = await InterviewRoom.findById(room);

    if (!interview) {
      throw new AppError("No interview found with that ID", 404);
    }
    if (!user) {
      throw new AppError("No user found with that ID", 404);
    }
    if (!interview.userIds.includes(user._id)) {
      throw new AppError("User not joined", 400);
    }

    const newBotResponse = new BotResponse({
      userId: user._id,
      reply: message,
      roomid: interview._id,
    });

    await newBotResponse.save();
    return newBotResponse;
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
};

exports.userLeave = async (token, room) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    const interview = await InterviewRoom.findById(room);

    if (!interview) {
      throw new AppError("No interview found with that ID", 404);
    }
    if (!user) {
      throw new AppError("No user found with that ID", 404);
    }
    if (!interview.userIds.includes(user._id)) {
      throw new AppError("User not joined", 400);
    }

    interview.userIds = interview.userIds.filter((id) => id !== user._id);
    await interview.save();
    return { user, interview };
  } catch (err) {
    throw new AppError(err.message, err.statusCode);
  }
};

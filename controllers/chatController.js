const fs = require("fs");
const dotenv = require("dotenv");
const { Configuration, OpenAIApi } = require("openai");
const { Chat, Message, BotResponse } = require("../models/chatModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const ApiFeatures = require("../utils/apiFeatures");

dotenv.config({ path: "./config.env" });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.getChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) {
    return next(new AppError("No chat found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      chat,
    },
  });
});

exports.getChats = catchAsync(async (req, res, next) => {
  const features = new ApiFeatures(Chat.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const chats = await features.query;

  res.status(200).json({
    status: "success",
    results: chats.length,
    data: {
      chats,
    },
  });
});

exports.createChat = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { chatDate, chatTime, chatDuration, chatRoomName } = req.body;

  const chat = await Chat.create({
    userId,
    chatDate,
    chatTime,
    chatDuration,
    chatRoomName,
  });

  res.status(201).json({
    status: "success",
    data: {
      chat,
    },
  });
});

exports.updateChat = catchAsync(async (req, res, next) => {
  const { userId, chatDate, chatTime, chatDuration, chatRoomName } = req.body;

  const chat = await Chat.findByIdAndUpdate(
    req.params.id,
    {
      userId,
      chatDate,
      chatTime,
      chatDuration,
      chatRoomName,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!chat) {
    return next(new AppError("No chat found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      chat,
    },
  });
});

exports.deleteChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findByIdAndDelete(req.params.id);

  if (!chat) {
    return next(new AppError("No chat found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// ... Other imports and setup

exports.sendMessage = catchAsync(async (req, res, next) => {
  // 1. Store the incoming audio
  const audioPath = "temp_audio.mp3";
  fs.writeFileSync(audioPath, req.body.audio); // Assuming audio data is in req.body.audio

  // 2. Transcribe the audio using OpenAI
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
    });

    // Delete the temporary audio file
    fs.unlinkSync(audioPath);

    const messageText = transcription.text;

    // 3. Save the transcribed message to the database
    const message = new Message({
      userId: req.body.userId,
      roomId: req.body.roomId,
      text: messageText,
      // ... other fields
    });

    await message.save();

    // Optional: If you want to get an immediate bot response, you can generate one here and save it too.
    const botResponseText = "Your logic to generate bot response"; // Replace with your logic
    const botResponse = new BotResponse({
      chatId: message.chatId, // Assuming you have chatId or similar reference
      text: botResponseText,
      // ... other fields
    });

    await botResponse.save();

    res.status(200).json({
      status: "success",
      data: {
        message,
        botResponse,
      },
    });
  } catch (error) {
    // Handle errors
    return next(new AppError("Error processing audio message.", 500));
  }
});

exports.getResponse = catchAsync(async (req, res, next) => {
  const { userId, reply, roomid } = req.body;

  const botResponse = await BotResponse.create({
    userId,
    reply,
    roomid,
  });

  res.status(201).json({
    status: "success",
    data: {
      botResponse,
    },
  });
});

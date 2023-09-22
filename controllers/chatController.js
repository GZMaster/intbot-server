const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const multer = require("multer");
const OpenAI = require("openai");
const { Chat, Message, BotResponse, Score } = require("../models/chatModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const ApiFeatures = require("../utils/apiFeatures");

dotenv.config({ path: "./config.env" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `./public/audio`); // Store audio files in a 'audio' directory
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Accept audio files only
  if (
    file.mimetype === "audio/mpeg" || // For MP3 files
    file.mimetype === "audio/wav" || // For WAV files
    file.mimetype === "audio/flac" // For FLAC files
    // Add other audio types if needed
  ) {
    return cb(null, true);
  }
  return cb(
    new AppError("Invalid file type! Please upload only audio files.", 400),
    false
  );
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 50 }, // Adjusted the limit to 50MB for audio files; you can change this based on your needs
  fileFilter: fileFilter,
});

exports.uploadAudio = upload.single("audio");

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
  const userId = req.user.id;

  // 1. Store the incoming audio
  const audioPath = `./public/audio/${Date.now()}.mp3`;

  fs.writeFileSync(audioPath, req.body.audio); // Assuming audio data is in req.body.audio

  // 2. Transcribe the audio using OpenAI
  try {
    const transcription = await openai.createTranslation(
      fs.createReadStream(audioPath),
      "whisper-1"
    );

    // Delete the temporary audio file
    fs.unlinkSync(audioPath);

    const messageText = transcription.text;

    // 3. Save the transcribed message to the database
    const message = new Message({
      userId,
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

exports.sendText = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const { text, roomId } = req.body;

  if (!text || text.trim().length === 0) {
    return next(new AppError("Text message cannot be empty.", 400));
  }

  // 1. Save the user's text message to the database
  const userMessage = new Message({
    userId,
    roomId,
    text: text,
  });

  await userMessage.save();

  // Get the last 3 messages from the database
  const userMessages = await Message.find({ roomId: roomId });

  const messages = [
    ...userMessages.slice(-3).map((message) => ({
      role: "user",
      content: message.text,
    })),
  ];

  // 2. Get a response from OpenAI GPT-4
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are an Interviewer and you are interviewing a student about their experience in thier place of work during their IT in nigeria, ask questions relating to where and naturer of work they did. ask one question at a time.",
      },
      ...messages,
    ],
    model: "gpt-4",
  });

  const { content } = await completion.choices[0].message;

  const botResponseText = content;

  // 3. Save the bot's response to the database
  const botResponse = new BotResponse({
    userId: userId, // You may want to use a different ID for the bot or a generic one
    roomId: roomId,
    reply: botResponseText,
    // ... other fields
  });

  await botResponse.save();

  res.status(200).json({
    status: "success",
    data: {
      userMessage,
      botResponse,
    },
  });
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

exports.getScore = catchAsync(async (req, res, next) => {
  const { userId } = req.user.id;
  const { roomId } = req.body;

  const userMessages = await Message.find({ roomId: roomId });

  const messages = [
    ...userMessages.slice(-3).map((message) => ({
      role: "user",
      content: message.text,
    })),
  ];

  // 2. Get a response from OpenAI GPT-4
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are an Interviewer and you are interviewing a student about their experience in thier place of work during their IT in nigeria, based on this conversation, rate the student's performance.",
      },
      ...messages,
    ],
    model: "gpt-4",
  });

  const { content } = await completion.choices[0].message;

  // 3. Save the bot's response to the database
  const score = new Score({
    userId: userId,
    roomId: roomId,
    score: content,
  });

  await score.save();

  res.status(200).json({
    status: "success",
    data: {
      score,
    },
  });
});

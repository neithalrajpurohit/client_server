import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticator } from "@otplib/preset-default";

import crypto from "crypto";
import pkg from "hi-base32";
const { encode } = pkg;

import { connectDB } from "./db.config.js";
import User from "./Models/User.js";
import Chats from "./Models/Chats.js";
import Group from "./Models/Group.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  /* options */
});

app.use(express.json());
dotenv.config();
connectDB(); //calling DB

httpServer.listen(9000, () => {
  console.log("server running on 9000");
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name) {
      return res
        .status(500)
        .json({ success: false, message: "name is mandatory" });
    }
    if (!email) {
      return res
        .status(500)
        .json({ success: false, message: "email is mandatory" });
    }
    if (!password) {
      return res
        .status(500)
        .json({ success: false, message: "password is mandatory" });
    }

    let user = await User.findOne({ email });

    // encrypting password
    const encryptedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      email,
      password: encryptedPassword,
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.log(err);
  }
});
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res
        .status(500)
        .json({ success: false, message: "Please enter your email" });
    }
    if (!password) {
      return res
        .status(500)
        .json({ success: false, message: "Please enter your password" });
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(500)
        .json({ success: false, message: "email not registered" });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res
        .status(500)
        .json({ success: false, message: "Invalid Password" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });
    return res.status(200).json({
      success: true,
      message: "Token Generated",
      data: token,
      user: user,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "failed to get login" });
    console.log(err);
  }
});
app.get("/get/allusers", async (req, res) => {
  try {
    const users = await User.find().sort("-time");
    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "failed to get users" });
  }
});
app.post("/getUserInfo", async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findById(id);
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: "user not found" });
  }
});

// custom middleware
const isLoggedIn = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res
        .status(403)
        .json({ success: false, message: "Authorization header is missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res
        .status(403)
        .json({ success: false, message: "Token is invalid" });
    }
    const user = await User.findById(decoded.id);
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// group routes
app.post("/group", isLoggedIn, async (req, res) => {
  try {
    const group = await Group.create({
      ...req.body,
      admin: req.user,
      users: [req.user],
    });
    res.status(201).json({
      success: true,
      data: group,
      message: "Group created successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed  to create group" });
  }
});
app.get("/groups", isLoggedIn, async (req, res) => {
  try {
    const groups = await Group.find({ users: { $in: [req.user._id] } });
    return res.status(200).json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get groups" });
  }
});
app.post("/group/info", async (req, res) => {
  try {
    const groupInfo = await Group.findOne({ _id: req.body.groupId });
    res.status(200).json({ success: true, data: groupInfo });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to Get Group Info" });
  }
});
app.get("/group/message/:groupId", async (req, res) => {
  try {
    const messages = await Chats.find({ groupId: req.params.groupId })
      .populate("fromUser")
      .populate("user");
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to Get Group Message" });
  }
});
app.post("/group/join", isLoggedIn, async (req, res) => {
  try {
    await Group.findOneAndUpdate(
      { _id: req.body.groupId },
      { $push: { users: [req.user._id] } }
    );
    res.status(200).json({ success: true, message: "User Joined Group" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to Join Group" });
  }
});
app.get("/group/info/:groupId", async (req, res) => {
  try {
    const groupInfo = await Group.findOne({ _id: req.params.groupId });
    res.status(200).json({ success: true, data: groupInfo });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to Get Group Info" });
  }
});
app.post("/group/update/:groupId", async (req, res) => {
  try {
    await Group.findOneAndUpdate(
      { _id: req.params.groupId },
      { $set: { ...req.body } },
      { new: true }
    );
    res.status(200).json({ success: true, message: "Group Updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to Update Group" });
  }
});
app.delete("/group/delete/:groupId", async (req, res) => {
  try {
    await Group.deleteOne({ _id: req.params.groupId });
    res.status(200).json({ success: true, message: "Group Deleted" });
  } catch (error) {
    res.json({ success: false, message: "Failed to Delete Group" });
  }
});
app.post("/group/leave/:groupId", async (req, res) => {
  try {
    await Group.findByIdAndUpdate(
      { _id: req.params.groupId },
      { $pull: { users: { $in: [req.body.userId] } } }
    );
    res.status(200).json({ success: true, message: "User Left Group" });
  } catch (error) {
    res.status(404).json({ success: false, message: "Failed to Leave Group" });
  }
});

// get recent message
app.post("/message/recent", async (req, res) => {
  try {
    const { fromUserId } = req.body;

    const allUsers = await User.find();
    const usersWithRecentMessages = [];

    for (const user of allUsers) {
      // Fetch the most recent message between the logged-in user and the current user
      const recentMessage = await Chats.findOne({
        $or: [
          {
            $and: [{ fromUser: fromUserId }, { toUser: user._id }],
          },
          {
            $and: [{ user: user._id }, { toUser: fromUserId }],
          },
        ],
      })
        .sort("-time") // Sort by most recent message
        .limit(1);

      // Create an object containing user information and their recent message
      const userWithRecentMessage = {
        user,
        recentMessage,
      };
      if (recentMessage) {
        // Push the object to the result array
        usersWithRecentMessages.push(userWithRecentMessage);
      }
    }
    return res
      .status(200)
      .json({ success: true, data: usersWithRecentMessages });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "message not found" });
  }
});

app.get("/message/:userId/:remoteUserId", async (req, res) => {
  try {
    const { userId, remoteUserId } = req.params;
    const messages = await Chats.find({
      $or: [
        {
          $and: [{ user: userId }, { toUser: remoteUserId }],
        },
        {
          $and: [{ user: remoteUserId }, { toUser: userId }],
        },
      ],
    })
      .populate("user")
      .sort("-createdAt");
    return res.status(200).json({ success: true, data: messages });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "message not found" });
  }
});

// generate otp secret
app.post("/otp/generate", async (req, res) => {
  const { email } = req.body;
  try {
    // generate secret
    const buffer = crypto.randomBytes(15);
    const base32 = encode(buffer).replace(/=/g, "").substring(0, 24);

    const user = email;
    const service = "Gossip";
    const keyUri = authenticator.keyuri(user, service, base32);

    await User.findOneAndUpdate(
      { email },
      { $set: { otpAuthUrl: keyUri, otpSecret: base32 } }
    );
    res.status(200).json({
      success: true,
      data: { otpAuthUrl: keyUri, otpSecret: base32 },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Fail to generate otp" });
  }
});

app.post("/otp/verify", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(500)
        .json({ success: false, message: "user not found" });
    }

    const isValid = authenticator.check(otp, user.otpSecret);
    if (!isValid) {
      return res.status(500).json({ success: false, message: "Invalid otp" });
    }
    await User.findOneAndUpdate(
      { _id: userId },
      { $set: { otpEnabled: true, otpVerified: true, mfaEnabled: true } }
    );

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });
    return res.status(200).json({
      success: true,
      message: "Otp Verified",
      data: token,
      user: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Fail to verify otp" });
  }
});

// socket code
io.on("connection", (socket) => {
  socket.on("joinroom", async (userData) => {
    let user = await User.findById(userData.user._id);
    user.isOnline = true;
    user.socketId = socket.id;
    await user.save();

    io.emit("users");
  });

  // listen for messages
  socket.on("message", async (data) => {
    const { from, to, message } = data;

    const messageToSave = message.map((message) => {
      return {
        text: message.text,
        user: message.user._id,
        createdAt: message.createdAt,
        location: message.location ?? null,
        image: message.image ?? null,
        fromUser: from.user._id,
        toUser: to._id,
        sent: true,
        received: false,
        pending: false,
        time: new Date(),
        msgId: message.msgId,
      };
    });

    const mesage = await Chats.create(messageToSave[0]);

    io.to(to.socketId).emit("message", {
      from: from,
      to: to,
      message: message,
    });
    io.to(to.socketId).emit("users");
    socket.emit("refresh-msg", messageToSave[0]);
  });

  // mark message as read
  socket.on("mark-read", async (cuUser) => {
    const updatedMessage = await Chats.findOneAndUpdate(
      { toUser: cuUser.user._id },
      { $set: { received: true } },
      { new: true }
    )
      .sort("-time")
      .populate("fromUser")
      .populate("toUser");
    const user = await User.findOne({ _id: updatedMessage.fromUser._id });
    io.to(user.socketId).emit("mark-read", { updatedMessage });
  });

  // group messages
  socket.on("joinGroup", (payload) => {
    const { user, groupId } = payload;
    socket.join(groupId);
  });

  // listen for messages
  socket.on("group-message", async (data) => {
    const { from, to, message, groupId } = data;

    const messageToSave = message.map((message) => {
      return {
        text: message.text,
        user: message.user._id,
        createdAt: message.createdAt,
        location: message.location ?? null,
        image: message.image ?? null,
        fromUser: from.user._id,
        sent: true,
        received: false,
        pending: false,
        time: new Date(),
        groupId: groupId,
        msgId: message.msgId,
      };
    });

    const mesage = await Chats.create(messageToSave[0]);

    socket.to(groupId).emit("group-message", {
      from: from,
      to: to,
      message: message,
    });
    io.to(groupId).emit("users");
    socket.emit("group-refresh-msg", messageToSave[0]);
  });

  socket.on("disconnect", async () => {
    let user = await User.findOne({ socketId: socket.id });
    if (user) {
      user.isOnline = false;
      user.socketId = null;
      await user.save();

      io.emit("users");
    }
  });

  console.log("user connected", socket.id);
});

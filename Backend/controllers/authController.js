'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const config = require('../config');
const { errors } = require('../middlewares/errorHandler');

function signTokens(payload) {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpires,
  });
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  });
  return { accessToken, refreshToken };
}

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).select('+passwordHash');
    if (!user) throw errors.Unauthorized('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw errors.Unauthorized('Invalid credentials');

    const payload = { sub: user._id.toString(), email: user.email, username: user.username };
    const { accessToken, refreshToken } = signTokens(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt });

    const obj = user.toObject();
    delete obj.passwordHash;
    res.json({ success: true, data: { user: obj, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { fullName, email, username, password } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) throw errors.Conflict('Email already in use');

    const existingUsername = await User.findOne({ username });
    if (existingUsername) throw errors.Conflict('Username already taken');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, username, passwordHash, fullName });

    const payload = { sub: user._id.toString(), email: user.email, username: user.username };
    const { accessToken, refreshToken } = signTokens(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt });

    const obj = user.toObject();
    delete obj.passwordHash;
    res.status(201).json({ success: true, data: { user: obj, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw errors.Unauthorized('Invalid or expired refresh token');
    }

    const stored = await RefreshToken.findOne({ token: refreshToken }).populate('userId');
    if (!stored || stored.expiresAt < new Date()) {
      throw errors.Unauthorized('Invalid or expired refresh token');
    }

    await RefreshToken.deleteOne({ _id: stored._id });

    const userDoc = stored.userId;
    const newPayload = {
      sub: stored.userId._id.toString(),
      email: userDoc.email,
      username: userDoc.username,
    };

    const { accessToken, refreshToken: newRefreshToken } = signTokens(newPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await RefreshToken.create({
      token: newRefreshToken,
      userId: stored.userId._id,
      expiresAt,
    });

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await RefreshToken.deleteMany({ userId: req.user.id });
    res.json({ success: true, data: null, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

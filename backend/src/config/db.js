'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info({ event: 'db.connected', uri: uri.replace(/\/\/.*@/, '//***@') }, 'MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn({ event: 'db.disconnected' }, 'MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ event: 'db.error', err }, 'MongoDB connection error');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  isConnected = true;
}

async function pingDB() {
  if (!isConnected || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB not connected');
  }
  await mongoose.connection.db.admin().ping();
  return true;
}

function getConnectionState() {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, pingDB, getConnectionState };

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  type: { type: String, enum: ['main', 'alt', 'farm'], required: true },
  tier: { type: String, enum: ['hk', 'lk'], required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Location', locationSchema);

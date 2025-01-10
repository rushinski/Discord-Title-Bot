const mongoose = require('mongoose');

const LastVisitedSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  kingdom: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LastVisited', LastVisitedSchema);

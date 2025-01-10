const mongoose = require('mongoose');

const LastVisitedSchema = new mongoose.Schema({
  kingdom: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

// Ensure there is only one global document
LastVisitedSchema.index({}, { unique: true, sparse: true });

module.exports = mongoose.model('LastVisited', LastVisitedSchema);

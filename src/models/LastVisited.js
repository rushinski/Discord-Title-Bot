/**
 * Model: LastVisited
 *
 * Purpose:
 * - Tracks the last visited kingdom for the title bot.
 * - Acts as a singleton document (only one entry exists at a time).
 *
 * Fields:
 * - kingdom   : The name/ID of the kingdom.
 * - updatedAt : Timestamp when the kingdom was last visited.
 */

const mongoose = require('mongoose');

const LastVisitedSchema = new mongoose.Schema({
  kingdom: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

// Enforce singleton: only one record should exist in this collection
LastVisitedSchema.index({}, { unique: true, sparse: true });

module.exports = mongoose.model('LastVisited', LastVisitedSchema);

/**
 * Model: Location
 *
 * Purpose:
 * - Stores user-specific in-game locations for Rise of Kingdoms.
 * - Each record corresponds to one account type (Main, Alt, Farm) per user.
 *
 * Fields:
 * - userId   : Discord user ID (unique identifier for the user).
 * - userName : Discord username (for readability/debugging).
 * - type     : Account type → Main, Alt, or Farm.
 * - tier     : Kingdom tier → HK (Home Kingdom) or LK (Lost Kingdom).
 * - x, y     : Coordinates in the game world.
 *
 * Notes:
 * - `timestamps` adds createdAt and updatedAt automatically.
 */

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    type: { type: String, enum: ['main', 'alt', 'farm'], required: true },
    tier: { type: String, enum: ['hk', 'lk'], required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Location', locationSchema);

/**
 * Entry point for the Discord Title Bot
 *
 * Responsibilities:
 * - Connects to MongoDB
 * - Initializes Discord.js client
 * - Loads commands and events
 * - Sets up ADB client for device interactions
 *
 * Environment Variables (from .env):
 * - BOT_TOKEN  : Discord bot authentication token
 * - MONGOURL   : MongoDB connection string
 */

const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const adb = require('adbkit');

const registerCommands = require('./utils/registerCommands');
const loadEvents = require('./utils/loadEvents');

// Load environment variables from .env file
dotenv.config();

const { MONGOURL, BOT_TOKEN } = process.env;

// Validate required environment variables
if (!MONGOURL || !BOT_TOKEN) {
  console.error('❌ Missing required environment variables (MONGOURL, BOT_TOKEN).');
  process.exit(1);
}

// --- MongoDB Connection ---
mongoose
  .connect(MONGOURL)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit if DB connection fails
  });

// --- Discord Client Setup ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds], // Only requesting guild-level interactions
});

// Maps and stores for commands & UI components
client.commands = new Map();
client.components = {};

// Bot ready event
client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  try {
    await registerCommands(client);
    console.log('✅ Commands registered successfully');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
});

// Load all event handlers
loadEvents(client);

// --- Discord Authentication ---
client
  .login(BOT_TOKEN)
  .then(() => console.log('✅ Discord bot logged in successfully'))
  .catch((err) => {
    console.error('❌ Discord bot login error:', err);
    process.exit(1); // Exit if login fails
  });

// --- ADB Setup ---
const adbClient = adb.createClient();
client.adbClient = adbClient; // Attach adbClient to Discord client for global access

adbClient
  .listDevices()
  .then((devices) => {
    if (devices.length > 0) {
      console.log('📱 ADB Devices connected:', devices.map((d) => d.id).join(', '));
    } else {
      console.warn('⚠️ No ADB devices connected.');
    }
  })
  .catch((err) => {
    console.error('❌ ADB connection error:', err);
  });

module.exports = client;

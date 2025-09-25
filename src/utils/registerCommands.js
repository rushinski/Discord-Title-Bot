/**
 * Utility: registerCommands
 *
 * Purpose:
 * - Loads all command modules from /commands.
 * - Registers them with Discord's API (global commands).
 * - Attaches them to the client for runtime execution.
 *
 * Security:
 * - Requires BOT_TOKEN and BOT_ID from .env.
 * - Never hardcode tokens in code.
 */

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
const { BOT_TOKEN, BOT_ID } = process.env;

/**
 * Registers all commands with Discord's API.
 *
 * @param {import('discord.js').Client} client - The Discord client instance.
 */
async function registerCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');

  if (!fs.existsSync(commandsPath)) {
    console.warn('⚠️ Commands directory not found.');
    return;
  }

  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data && typeof command.data.toJSON === 'function') {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
      console.log(`✅ Registered command: ${command.data.name}`);
    } else {
      console.warn(`⚠️ Skipping ${file}: Invalid command structure (missing "data").`);
    }
  }

  // Push commands to Discord via REST API
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  try {
    console.log('🔄 Refreshing global application (/) commands...');
    const data = await rest.put(Routes.applicationCommands(BOT_ID), { body: commands });
    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('❌ Failed to refresh commands:', error);
  }
}

module.exports = registerCommands;

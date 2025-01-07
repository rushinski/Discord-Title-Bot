const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
const { BOT_TOKEN, BOT_ID } = process.env;

async function registerCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Validate command structure
    if (command.data && typeof command.data.toJSON === 'function') {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`Skipping ${file}: Missing or invalid 'data' property.`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    const data = await rest.put(
      Routes.applicationCommands(BOT_ID),
      { body: commands },
    );
    console.log(`Successfully reloaded application (/) commands: ${data.length}`);
  } catch (error) {
    console.error('Error refreshing commands:', error);
  }
}

module.exports = registerCommands;

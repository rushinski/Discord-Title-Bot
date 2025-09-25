/**
 * Utility: loadEvents
 *
 * Purpose:
 * - Dynamically loads all event handlers from the /events directory.
 * - Binds them to the Discord.js client.
 *
 * Behavior:
 * - Skips invalid event files (missing name or execute function).
 * - Supports both `.once` (fire once) and `.on` (persistent) events.
 */

const fs = require('fs');
const path = require('path');

/**
 * Loads event files and registers them to the Discord client.
 *
 * @param {import('discord.js').Client} client - The Discord.js client instance.
 */
module.exports = function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');

  if (!fs.existsSync(eventsPath)) {
    console.warn('⚠️ No events directory found.');
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));

    if (!event.name || typeof event.execute !== 'function') {
      console.warn(`⚠️ Skipping invalid event file: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }

    console.log(`✅ Event loaded: ${event.name}`);
  }
};

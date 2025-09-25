/**
 * /title Command
 *
 * Purpose:
 * - Assigns temporary titles (Duke, Scientist, Architect, Justice) in Rise of Kingdoms.
 * - Ensures titles are locked for a cooldown period (90s) to prevent overlap.
 * - Uses a main queue and per-title queues to coordinate requests.
 *
 * Flow:
 * - Users request a title → request added to queues.
 * - Bot assigns title via ADB automation (handled in utils/addTitle.js).
 * - Title is locked for 90 seconds, then released.
 *
 * Security:
 * - Requires a valid ADB device connection.
 * - Validates user location against stored records.
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const LocationModel = require('../models/Location');
const LastVisitedModel = require('../models/LastVisited');
const { addTitle } = require('../utils/addTitle');
const client = require('../index');

// Queues and locks
const pendingTitleRequests = { duke: [], justice: [], architect: [], scientist: [] };
const activeTitles = new Map(); // Lock active titles for cooldown
const isProcessing = { duke: false, justice: false, architect: false, scientist: false };

const mainActionQueue = [];
let isBotProcessing = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('title')
    .setDescription('Assign a title in Rise of Kingdoms.')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Select account type')
        .setRequired(true)
        .addChoices(
          { name: 'Main', value: 'main' },
          { name: 'Alt', value: 'alt' },
          { name: 'Farm', value: 'farm' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('tier')
        .setDescription('Select kingdom tier')
        .setRequired(true)
        .addChoices(
          { name: 'HK', value: 'hk' },
          { name: 'LK', value: 'lk' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('Select title')
        .setRequired(true)
        .addChoices(
          { name: 'Duke', value: 'duke' },
          { name: 'Scientist', value: 'scientist' },
          { name: 'Architect', value: 'architect' },
          { name: 'Justice', value: 'justice' },
        ),
    ),

  async execute(interaction) {
    const adbClient = client.adbClient;
    if (!adbClient) {
      console.error('❌ ADB Client is not initialized.');
      return interaction.reply('❌ ADB Client unavailable. Please contact the bot administrator.');
    }

    try {
      const type = interaction.options.getString('type');
      const tier = interaction.options.getString('tier');
      const title = interaction.options.getString('title');

      await interaction.deferReply({ ephemeral: true });

      // Ensure user has a stored location
      const userLocation = await LocationModel.findOne({ userId: interaction.user.id, type });
      if (!userLocation) {
        return interaction.editReply({ content: '❌ No location found. Use `/set-location` first.' });
      }

      // Verify tier matches stored location
      if (userLocation.tier !== tier) {
        return interaction.editReply({
          content: '❌ Tier mismatch. Please update your location with `/set-location`.',
        });
      }

      const { x, y } = userLocation;
      const kingdom = tier === 'hk' ? process.env.HOME_KD : process.env.LOST_KD;

      // Validate ADB connection
      const devices = await adbClient.listDevices();
      if (!devices || devices.length === 0) {
        return interaction.editReply({ content: '❌ No ADB devices connected.' });
      }

      const deviceId = devices[0]?.id;
      if (!deviceId) {
        return interaction.editReply({ content: '❌ Unable to retrieve device ID. Check ADB setup.' });
      }

      console.log(`📱 Using device: ${deviceId}`);

      // Queue assignment
      await queueTitleAssignment({
        adbClient,
        logger: console,
        kingdom,
        x,
        y,
        title,
        deviceId,
        interaction,
      });

      await interaction.editReply({
        content: `✅ Request queued: assigning **${title}** for **${type}** in **${tier.toUpperCase()}**.\nLast kingdom updated: **${kingdom}**.`,
      });
    } catch (error) {
      console.error('❌ Error assigning title:', error);
      await interaction.editReply({
        content: `⚠️ An error occurred while assigning the title: ${error.message}`,
      });
    }
  },
};

/**
 * Add request to queues and start processing
 */
async function queueTitleAssignment(params) {
  const { title, interaction, logger } = params;

  if (!pendingTitleRequests[title]) {
    logger.error(`Invalid title: ${title}`);
    return interaction.editReply(`❌ Invalid title selection.`);
  }

  pendingTitleRequests[title].push(params);
  logger.info(`📌 Added request to ${title} queue. Length: ${pendingTitleRequests[title].length}`);

  if (activeTitles.has(title)) {
    return interaction.editReply(`⏳ **${title.toUpperCase()}** in use. Added to queue.`);
  }

  mainActionQueue.push(params);
  logger.info(`📌 Added ${title} request to main queue. Length: ${mainActionQueue.length}`);

  if (!isBotProcessing) {
    processMainQueue();
  }
}

/**
 * Process main queue in FIFO order
 */
async function processMainQueue() {
  if (mainActionQueue.length === 0) {
    console.log('✅ Main queue empty. Stopping processing.');
    isBotProcessing = false;
    return;
  }

  isBotProcessing = true;
  const request = mainActionQueue.shift();

  console.log(`⚡ Processing ${request.title} request. Queue size: ${mainActionQueue.length}`);

  try {
    await assignTitle(request);
  } catch (error) {
    console.error(`❌ Error processing request:`, error);
  }

  setTimeout(processMainQueue, 500); // Short delay between requests
}

/**
 * Process queue for a specific title
 */
async function processQueue(title) {
  if (pendingTitleRequests[title].length === 0) {
    isProcessing[title] = false;
    return;
  }

  if (isBotProcessing) return;

  isProcessing[title] = true;
  const request = pendingTitleRequests[title].shift();

  try {
    await assignTitle(request);
  } catch (error) {
    console.error(`❌ Error processing ${title} request:`, error);
  }

  isProcessing[title] = false;
  processMainQueue();
}

/**
 * Assign title and enforce lock
 */
async function assignTitle(params) {
  const { title, interaction } = params;

  if (activeTitles.has(title)) {
    console.log(`⏳ ${title} already locked. Request queued.`);
    return;
  }

  // Lock title for 90s
  activeTitles.set(title, Date.now() + 90000);
  console.log(`🔒 Title ${title} locked for 90s.`);

  await interaction.editReply(`✅ Assigning **${title.toUpperCase()}**...`);

  try {
    await addTitle(params); // Executes actual ADB automation
  } catch (error) {
    console.error(`❌ Error in addTitle for ${title}:`, error);
  }

  await interaction.editReply(`🎉 **${title.toUpperCase()}** assigned! Locked for 90s.`);

  setTimeout(() => {
    activeTitles.delete(title);
    console.log(`🔓 Title ${title} released.`);

    if (pendingTitleRequests[title].length > 0) {
      processQueue(title);
    } else {
      processMainQueue();
    }
  }, 90000);
}

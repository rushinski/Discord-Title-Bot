const { SlashCommandBuilder } = require('@discordjs/builders');
const LocationModel = require('../models/Location');
const LastVisitedModel = require('../models/LastVisited');
const { addTitle } = require('../utils/addTitle');
const client = require('../index');

const pendingTitleRequests = {
  duke: [],
  justice: [],
  architect: [],
  scientist: []
};
const activeTitles = new Map(); // Track active title locks
const isProcessing = { duke: false, justice: false, architect: false, scientist: false };

const mainActionQueue = [];
let isBotProcessing = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('title')
    .setDescription('Assign a title in Rise of Kingdoms.')
    .addStringOption(option =>
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
    .addStringOption(option =>
      option
        .setName('tier')
        .setDescription('Select kingdom tier')
        .setRequired(true)
        .addChoices(
          { name: 'HK', value: 'hk' },
          { name: 'LK', value: 'lk' },
        ),
    )
    .addStringOption(option =>
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
      console.error('ADB Client is not initialized.');
      return interaction.reply('❌ ADB Client is not available. Please contact the bot administrator.');
    }

    try {
      const type = interaction.options.getString('type');
      const tier = interaction.options.getString('tier');
      const title = interaction.options.getString('title');

      await interaction.deferReply({ ephemeral: true });

      const userLocation = await LocationModel.findOne({ userId: interaction.user.id, type });
      if (!userLocation) {
        return interaction.editReply({
          content: '❌ No location found. Please set a location with `/set-location`.',
        });
      }

      if (userLocation.tier !== tier) {
        return interaction.editReply({
          content: '❌ The location tier does not match the specified tier. Please set a valid location with `/set-location`.',
        });
      }

      const { x, y } = userLocation;
      const kingdom = tier === 'hk' ? process.env.HOME_KD : process.env.LOST_KD;

      const devices = await adbClient.listDevices();
      if (!devices || devices.length === 0) {
        return interaction.editReply({
          content: '❌ No ADB devices connected. Please connect a device.',
        });
      }

      const deviceId = devices[0]?.id;
      if (!deviceId) {
        return interaction.editReply({
          content: '❌ Unable to retrieve device ID. Please ensure your ADB setup is correct.',
        });
      }

      console.log(`Using device: ${deviceId}`);

      await queueTitleAssignment({
        adbClient,
        logger: console,
        kingdom,
        x,
        y,
        title,
        deviceId,
        interaction
    });    

      await interaction.editReply({
        content: `✅ Successfully assigned the **${title}** title for **${type}** in **${tier.toUpperCase()}**! Last kingdom updated globally to: **${kingdom}**.`,
      });
    } catch (error) {
      console.error('Error assigning title:', error);
      await interaction.editReply({
        content: `❌ An error occurred while assigning the title: ${error.message}`,
      });
    }
  },  
};

async function queueTitleAssignment(params) {
  const { title, interaction, logger } = params;

  if (!pendingTitleRequests[title]) {
      logger.error(`Invalid title: ${title}`);
      return interaction.editReply(`❌ Invalid title selection.`);
  }

  // Add request to the specific title queue
  pendingTitleRequests[title].push(params);
  logger.info(`Added request to ${title} queue. Queue length: ${pendingTitleRequests[title].length}`);

  // Notify user if they are queued
  if (activeTitles.has(title)) {
      return interaction.editReply(`⏳ **${title.toUpperCase()}** is currently assigned. You've been added to the queue.`);
  }

  // Add to main action queue
  mainActionQueue.push(params);
  logger.info(`Added ${title} request to MAIN queue. Main queue length: ${mainActionQueue.length}`);

  // Start processing the main queue if not already running
  if (!isBotProcessing) {
      processMainQueue();
  }
}

async function processMainQueue() {
  if (mainActionQueue.length === 0) {
    console.log("Main queue is empty. Stopping processing.");
    isBotProcessing = false;
    return;
  }

  isBotProcessing = true;
  const request = mainActionQueue.shift(); // Get next request from the main queue

  console.log(`Processing request for ${request.title}. Queue length: ${mainActionQueue.length}`);

  try {
    await assignTitle(request); // 🛑 This was missing! This actually executes the title assignment.
  } catch (error) {
    console.error(`Error processing request:`, error);
  }

  // After processing, check for the next request
  setTimeout(() => {
    processMainQueue();
  }, 500); // Short delay before processing the next request
}

async function processQueue(title) {
  if (pendingTitleRequests[title].length === 0) {
      isProcessing[title] = false;
      return;
  }

  // Ensure only ONE title is being assigned at a time
  if (isBotProcessing) return; 

  isProcessing[title] = true;
  const request = pendingTitleRequests[title].shift();

  try {
      await assignTitle(request);
  } catch (error) {
      console.error(`Error processing ${title} request:`, error);
  }

  // Once finished, allow the next request in the MAIN queue to proceed
  isProcessing[title] = false;
  processMainQueue(); 
}


async function assignTitle(params) {
  const { title, interaction, logger } = params;

  console.log(`Attempting to assign title: ${title}`);

  if (activeTitles.has(title)) {
    console.log(`${title} is already assigned. Request queued.`);
    return;
  }

  // Lock the title for 90 seconds
  activeTitles.set(title, Date.now() + 90000);
  console.log(`Title ${title} assigned and locked for 90 seconds.`);

  await interaction.editReply(`✅ Assigning **${title.toUpperCase()}**...`);

  try {
    console.log(`Calling addTitle() for ${title}...`);
    await addTitle(params); // ✅ Ensure this executes!
  } catch (error) {
    console.error(`Error in addTitle for ${title}:`, error);
  }

  await interaction.editReply(`🎉 **${title.toUpperCase()}** assigned! It will be locked for **90 seconds**.`);

  // Unlock title after 90 seconds
  setTimeout(() => {
    activeTitles.delete(title);
    console.log(`Title ${title} is now available.`);

    // Process next request in the queue
    if (pendingTitleRequests[title].length > 0) {
      processQueue(title);
    } else {
      processMainQueue(); // Continue processing main queue
    }
  }, 90000);
}

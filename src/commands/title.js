const { SlashCommandBuilder } = require('@discordjs/builders');
const LocationModel = require('../models/Location');
const LastVisitedModel = require('../models/LastVisited');
const { addTitle } = require('../utils/addTitle');
const client = require('../index');

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

      await addTitle({
        adbClient,
        logger: console,
        kingdom,
        x,
        y,
        title,
        deviceId,
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

const { SlashCommandBuilder } = require('discord.js');
const LocationModel = require('../models/Location');
const { addTitle } = require('../utils/addTitle');

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
    const type = interaction.options.getString('type');
    const tier = interaction.options.getString('tier');
    const title = interaction.options.getString('title');
    const userId = interaction.user.id;

    // Defer the reply to allow time for processing
    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch location data from MongoDB
      const userLocation = await LocationModel.findOne({ userId, type });

      if (!userLocation || userLocation.tier !== tier) {
        return interaction.editReply({
          content: '❌ You must set a valid location with `/set-location` before assigning a title.',
        });
      }

      const { x, y } = userLocation;

      // Prepare the addTitle function call
      const kingdom = tier === 'hk' ? process.env.HOME_KD : 'Lost Kingdom';
      const device = { 
        shell: async (command) => console.log(`ADB Command: ${command}`), 
        // Replace this mock with your actual ADB connection logic
      };

      // Execute title assignment
      await addTitle({
        device,
        title,
        logger: console,
        kingdom,
        x,
        y,
      });

      await interaction.editReply({
        content: `✅ Successfully assigned the **${title}** title for **${type}** in **${tier.toUpperCase()}**!`,
      });
    } catch (error) {
      console.error('Error assigning title:', error);
      await interaction.editReply({
        content: '❌ An error occurred while assigning the title. Please try again.',
      });
    }
  },
};

const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction } = require('discord.js');
const Location = require('../models/Location');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('title')
    .setDescription('Set a title based on type, tier, and location.')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Select account type')
        .setRequired(true)
        .addChoices(
          { name: 'Main', value: 'main' },
          { name: 'Alt', value: 'alt' },
          { name: 'Farm', value: 'farm' }
        )
    )
    .addStringOption(option =>
      option.setName('tier')
        .setDescription('Select kingdom tier')
        .setRequired(true)
        .addChoices(
          { name: 'HK', value: 'hk' },
          { name: 'LK', value: 'lk' }
        )
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Select title')
        .setRequired(true)
        .addChoices(
          { name: 'Duke', value: 'duke' },
          { name: 'Scientist', value: 'scientist' },
          { name: 'Architect', value: 'architect' },
          { name: 'Justice', value: 'justice' }
        )
    ),

  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    const userId = interaction.user.id;
    const userName = interaction.user.username;

    try {
      // Check if the user has their location set in MongoDB
      const userLocation = await Location.findOne({ userId });

      if (!userLocation) {
        return interaction.reply({
          content: `You need to set your location first before using this command.`,
          ephemeral: true
        });
      }

      // Collect options from the command
      const type = interaction.options.getString('type');
      const tier = interaction.options.getString('tier');
      const title = interaction.options.getString('title');

      // Validate the type and tier against the MongoDB record
      if (userLocation.type !== type || userLocation.tier !== tier) {
        return interaction.reply({
          content: `Your selected type (\`${type}\`) and tier (\`${tier.toUpperCase()}\`) do not match the location settings in your profile.\nPlease update your location if needed.`,
          ephemeral: true
        });
      }

      // Reply with success, acknowledging the user's title assignment
      await interaction.reply({
        content: `✅ **Title Assigned**\nUser: **${userName}**\nAccount Type: **${type}**\nKingdom Tier: **${tier.toUpperCase()}**\nTitle: **${title}**\nLocation Coordinates: **X: ${userLocation.x}, Y: ${userLocation.y}**`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error executing /title command:', error);
      await interaction.reply({
        content: `There was an error while processing your request. Please try again later.`,
        ephemeral: true
      });
    }
  }
};

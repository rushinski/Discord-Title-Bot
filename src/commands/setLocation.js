const { SlashCommandBuilder } = require('discord.js');
const LocationModel = require('../models/Location'); // MongoDB model

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-location')
    .setDescription('Save your location data to the database')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Select the type of location')
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
        .setDescription('Select the tier of the location')
        .setRequired(true)
        .addChoices(
          { name: 'HK', value: 'hk' },
          { name: 'LK', value: 'lk' },
        ),
    )
    .addNumberOption(option =>
      option
        .setName('x')
        .setDescription('Enter the X coordinate')
        .setRequired(true),
    )
    .addNumberOption(option =>
      option
        .setName('y')
        .setDescription('Enter the Y coordinate')
        .setRequired(true),
    ),
  async execute(interaction) {
    const type = interaction.options.getString('type');
    const tier = interaction.options.getString('tier');
    const x = interaction.options.getNumber('x');
    const y = interaction.options.getNumber('y');
    const userId = interaction.user.id;
    const userName = interaction.user.username;

    try {
      // Check if an existing record matches the userId and type
      const updatedLocation = await LocationModel.findOneAndUpdate(
        { userId, type }, // Query to match existing entry by userId and type
        { userId, userName, type, tier, x, y }, // New data to save
        { new: true, upsert: true } // Options: return updated doc and insert if none exists
      );

      await interaction.reply({
        content: `✅ Location updated successfully!\n**Type:** ${type}\n**Tier:** ${tier}\n**Coordinates:** (x${x}, y${y})`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error updating location:', error);
      await interaction.reply({
        content: '❌ An error occurred while saving your location. Please try again later.',
        ephemeral: true,
      });
    }
  },
};

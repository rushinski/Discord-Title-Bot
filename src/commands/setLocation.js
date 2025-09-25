/**
 * /set-location Command
 *
 * Purpose:
 * - Allows users to save or update their in-game location in MongoDB.
 * - Locations are categorized by type (Main, Alt, Farm) and tier (HK, LK).
 * - Coordinates (X, Y) are stored for quick retrieval.
 *
 * Notes:
 * - Uses MongoDB upsert to ensure one record per user per location type.
 * - Replies with confirmation on success or an error message on failure.
 */

const { SlashCommandBuilder } = require('discord.js');
const LocationModel = require('../models/Location'); // MongoDB model for locations

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-location')
    .setDescription('Save your location data to the database')
    .addStringOption((option) =>
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
    .addStringOption((option) =>
      option
        .setName('tier')
        .setDescription('Select the tier of the location')
        .setRequired(true)
        .addChoices(
          { name: 'HK', value: 'hk' },
          { name: 'LK', value: 'lk' },
        ),
    )
    .addNumberOption((option) =>
      option
        .setName('x')
        .setDescription('Enter the X coordinate')
        .setRequired(true),
    )
    .addNumberOption((option) =>
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
      // Upsert user location record by type
      await LocationModel.findOneAndUpdate(
        { userId, type }, // Match by user and location type
        { userId, userName, type, tier, x, y }, // Data to save
        { new: true, upsert: true }, // Insert if none exists
      );

      await interaction.reply({
        content: `✅ Location saved successfully!\n**Type:** ${type}\n**Tier:** ${tier}\n**Coordinates:** (x${x}, y${y})`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('❌ Error updating location:', error);
      await interaction.reply({
        content: '⚠️ An error occurred while saving your location. Please try again later.',
        ephemeral: true,
      });
    }
  },
};

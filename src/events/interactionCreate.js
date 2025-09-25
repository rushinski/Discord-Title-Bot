/**
 * Event: interactionCreate
 *
 * Purpose:
 * - Handles all incoming interactions (slash commands, buttons, modals, etc.).
 * - Dispatches commands to their respective handlers in /commands.
 *
 * Error Handling:
 * - Catches and logs command execution errors.
 * - Provides consistent feedback to users.
 */

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    // Only handle slash commands (ignore buttons, modals for now)
    if (!interaction.isCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`⚠️ No command found for: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Error executing command "${interaction.commandName}":`, error);

      const errorMessage = {
        content: '⚠️ There was an error while executing this command. Please try again later.',
        ephemeral: true,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};

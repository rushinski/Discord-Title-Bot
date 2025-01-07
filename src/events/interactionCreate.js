module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          content: 'Command not found.',
          ephemeral: true,
        });
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        await interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        });
      }
    }
    // Handle other interaction types (e.g., buttons, modals) if needed
  },
};

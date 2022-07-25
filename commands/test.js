const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test various things!'),
    async execute(client, interaction) {
        await interaction.reply('Success!');
    },
};
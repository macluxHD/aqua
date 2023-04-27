const { SlashCommandBuilder } = require('@discordjs/builders');

// helper functions
const reply = require('../utils/reply');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with the latency!'),
    async execute(client, interaction, message) {
        reply(interaction, message?.channel, `Pong! Latency is ${client.ws.ping}ms.`);
    },
};
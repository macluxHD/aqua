const { SlashCommandBuilder } = require('@discordjs/builders');
const utils = require('../utils');
const settingsmap = require('../settingsmap.json');

const command = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Manage server settings')
    .setDefaultMemberPermissions(0);

const settingsArray = Object.keys(settingsmap).map(key => {
    return {
        name: key,
        ...settingsmap[key],
    };
});

for (const setting of settingsArray) {
    command.addSubcommand(subcommand => {
        subcommand.setName(setting.name.toLowerCase())
            .setDescription(setting.description);

        switch (setting.type) {
            case 'boolean':
                return subcommand.addBooleanOption(option => option.setName('boolean').setRequired(true).setDescription('True or false'));
            case 'string':
                return subcommand.addStringOption(option => option.setName('string').setRequired(true).setDescription('String'));
            case 'channel':
                return subcommand.addChannelOption(option => option.setName('channel').setRequired(true).setDescription('Channel'));
        }
    });
}

module.exports = {
    data: command,
    async execute(client, interaction, message) {
        if (!interaction) {
            utils.reply(interaction, message.channel, 'This command can only be used as a slash command!');
            return;
        }
        const member = interaction.member;
        if (!member.permissions.has('ADMINISTRATOR')) {
            utils.reply(interaction, message.channel, 'You do not have permission to use this command!');
            return;
        }
    },
};
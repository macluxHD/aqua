const { SlashCommandBuilder } = require('@discordjs/builders');
const settingsmap = require('../settingsmap.json');

// helper functions
const reply = require('../utils/reply');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create the command
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

// Code to execute when the command is run
module.exports = {
    data: command,
    async execute(client, interaction, message) {
        if (!interaction) {
            reply(interaction, message.channel, 'This command can only be used as a slash command!');
            return;
        }
        const member = interaction.member;
        if (!member.permissions.has('ADMINISTRATOR')) {
            reply(interaction, message.channel, 'You do not have permission to use this command!');
            return;
        }

        const setting = interaction.options;

        // get the settingname from the settingmap not lower cased
        const settingname = settingsArray.find(s => s.name.toLowerCase() === setting.getSubcommand()).name;
        const option = settingsmap[settingname].type;

        await prisma.guild.update({
            where: {
                id: interaction.guild.id,
            },
            data: {
                [settingname]: setting.get(option).value,

            },
        });

        if (option === 'channel') {
            interaction.reply(`Setting ${settingname} has been set to <#${setting.get(option).value}>`);
            return;
        }
        interaction.reply(`Setting ${settingname} has been set to ${setting.get(option).value}`);
    },
};
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

function convertToSettingArray(settings) {
    return Object.keys(settings).map(key => {
        return {
            name: key,
            ...settings[key],
        };
    });
}

function addOption(opt, option, optionTemplate) {
    return opt.setName(option.name).setRequired(option.required).setDescription(optionTemplate.description);
}

function createSub(cmd, setting) {
    return cmd.addSubcommand(sub => {
        sub.setName(setting.name.toLowerCase())
            .setDescription(setting.description);

        if (!setting.options) return sub;
        for (const option of setting.options) {
            const optionTemplate = settingsmap.options[option.name];
            switch (optionTemplate.type) {
                case 'boolean':
                    sub.addBooleanOption(opt => addOption(opt, option, optionTemplate));
                    break;
                case 'string':
                    sub.addStringOption(opt => addOption(opt, option, optionTemplate));
                    break;
                case 'channel':
                    sub.addChannelOption(opt => addOption(opt, option, optionTemplate));
                    break;
                case 'choices':
                    sub.addStringOption(opt => addOption(opt, option, optionTemplate).addChoices(...optionTemplate.choices));
                    break;
            }
        }
        return sub;
    });
}

function createSubGroup(cmd, setting) {
    return cmd.addSubcommandGroup(subcommand => {
        subcommand.setName(setting.name.toLowerCase())
            .setDescription(setting.description);

        for (const sub of convertToSettingArray(setting.subcommands)) {
            subcommand = createSub(subcommand, sub);
        }
        return subcommand;
    });
}

for (const setting of convertToSettingArray(settingsmap.settings)) {
    if (!setting.subcommands) {
        createSub(command, setting);
    }
    else {
        createSubGroup(command, setting);
    }
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
        const settingname = convertToSettingArray(settingsmap.settings).find(s => s.name.toLowerCase() === setting.getSubcommand()).name;
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
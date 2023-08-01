const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const settingsmap = require('../settingsmap.json');

// helper functions
const reply = require('../utils/reply');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const superagent = require('superagent');

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
        sub.setName(setting.name)
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
        subcommand.setName(setting.name)
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
        switch (setting.getSubcommandGroup()) {
            // settings related to the animenotify feature
            case 'animenotify':
                animenotifySettingsHandler(setting, interaction);
                break;

            // normal setting related to the guild
            default:
                guildSettingsHandler(setting, interaction);
                break;
        }
    },
};

async function animenotifySettingsHandler(setting, interaction) {
    switch (setting.getSubcommand()) {
        // list all anime on the list
        case 'list': {
            const anime = await prisma.anime.findMany({
                where: {
                    guildId: interaction.guild.id,
                },
            });

            const guild = await prisma.guild.findUnique({
                where: {
                    id: interaction.guild.id,
                },
            });

            if (anime.length === 0) {
                interaction.reply('There are no anime on the watchlist!');
                return;
            }

            // TODO: actually fetch the names of the animes using the anilist api
            const embed = new EmbedBuilder()
                .setTitle('Anime on the ' + (guild.aniNotifisBlacklist ? 'blacklist' : 'watchlist'))
                .setDescription(anime.map(a => `${a.animeId}`).join('\n'));

            interaction.reply({ embeds: [embed] });
            break;
        }
        // add an anime from the list
        case 'add': {
            const ids = setting.get('animeid').value.split(',');

            interaction.reply(`Adding ${ids.length} animes to the list...`);

            const channel = interaction.guild.channels.cache.get(interaction.channelId);

            for (const id of ids) {
                // check if there is already an anime with the same id
                const anime = await prisma.anime.findFirst({
                    where: {
                        guildId: interaction.guild.id,
                        animeId: id,
                    },
                });

                if (anime !== null) {
                    channel.send(`The anime with the id ${id} is already being watched!`);
                    continue;
                }

                const route = await superagent.get('https://animeschedule.net/api/v3/anime')
                    .query({ 'anilist-ids': id })
                    .then(res => {
                        return res.body.anime[0].route;
                    })
                    .catch(() => {
                        channel.send(`Error while fetching anime with id ${id}, may not exist!`);
                        return false;
                    });

                if (!route) continue;

                await prisma.anime.create({
                    data: {
                        guildId: interaction.guild.id,
                        animeId: id,
                        anischeduleRoute: route,
                    },
                });
                channel.send(`The anime with the id ${id} has been added to the list!`);
            }
            break;
        }
        // remove an anime from the list
        case 'remove': {
            const ids = setting.get('animeid').value.split(',');

            interaction.reply(`Removing ${ids.length} animes from the list...`);

            const channel = interaction.guild.channels.cache.get(interaction.channelId);

            for (const id of ids) {

                // check if there is already an anime with the same id
                const anime = await prisma.anime.findFirst({
                    where: {
                        guildId: interaction.guild.id,
                        animeId: id,
                    },
                });

                if (!anime) {
                    channel.send(`The anime with the id ${id} is not in the list, there is nothing to be removed here!`);
                    continue;
                }

                await prisma.anime.delete({
                    where: {
                        id: anime.id,
                    },
                });
                channel.send(`Anime with the id ${id} has been removed from the list!`);
            }
            break;
        }
    }
}

async function guildSettingsHandler(setting, interaction) {
    const option = settingsmap.settings[setting.getSubcommand()].options[0];

    await prisma.guild.update({
        where: {
            id: interaction.guild.id,
        },
        data: {
            [option.rowname]: setting.get(option.name).value,

        },
    });

    if (option.name === 'channel') {
        interaction.reply(`Setting ${setting.getSubcommand()} has been set to <#${setting.get(option.name).value}>`);
        return;
    }
    interaction.reply(`Setting ${setting.getSubcommand()} has been set to ${setting.get(option.name).value}`);
}
const musicCommands = ['play', 'page', 'skip', 'loop', 'clearqueue', 'stop', 'pause'];
const ytRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// helper functions
const reply = require('./reply');
const refreshMusicEmbed = require('./refreshMusicEmbed');

/**
 * Checks if the command has been used in a special channel and if so, handles it accordingly
 * @param {any} client
 * @param {any} interaction
 * @param {any} message
 * @returns {any}
 */
module.exports = async (client, interaction, message) => {
    const isInteraction = interaction !== null;

    const guild = isInteraction ? interaction.guild : message.guild;
    const channel = isInteraction ? interaction.channel : message.channel;
    const dbGuild = await prisma.guild.findUnique({ where: { id: guild.id } });

    const prefix = dbGuild.prefix;

    let command;

    if (isInteraction) command = interaction.commandName;
    else command = message.content.trim().split(/ +/g)[0];

    const isPrefixCommand = command.startsWith(prefix) && musicCommands.includes(command.substring(prefix.length));
    const isNonPrefixCommand = musicCommands.includes(command);
    const isSlashCommand = isInteraction && musicCommands.includes(interaction.commandName);

    const isMusicChannel = channel.id == dbGuild.musicChannelId;

    if (!isMusicChannel && !isSlashCommand && !isPrefixCommand) return false;

    if (!isMusicChannel && (isPrefixCommand || isNonPrefixCommand)) {
        await reply(interaction, channel, 'This command cannot be used here!');
        return true;
    }

    if (!isInteraction && isMusicChannel) {
        setTimeout(() => {
            if (!message.pinned) {
                message.delete()
                    // eslint-disable-next-line no-inline-comments
                    .catch(() => { /* message already deleted */ });
            }
        }, 5000);
    }

    if (!isMusicChannel) return false;

    if (ytRegex.test(command)) {
        try {
            client.commands.get('play').execute(client, interaction, message, ['play', command]);
        }
        catch (error) {
            console.error(error);
            await reply(null, message.channel, 'An error occurred while executing that command!');
        }
        refreshMusicEmbed(guild);
        return true;
    }

    if (isPrefixCommand || isSlashCommand || isNonPrefixCommand) {
        if (isPrefixCommand) command = command.substring(prefix.length);
        try {
            client.commands.get(command).execute(client, interaction, message, message?.content?.split(/ +/g));
        }
        catch (error) {
            console.error(error);
            await reply(null, message.channel, 'An error occurred while executing that command!');
        }
        refreshMusicEmbed(guild);
        return true;
    }

    return false;
};
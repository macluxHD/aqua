const musicCommands = ['play', 'page', 'skip', 'loop', 'clearqueue', 'stop', 'pause'];
const ytRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (utils, client, interaction, message) => {
    const isSlashCommand = interaction !== null;

    const guild = isSlashCommand ? interaction.guild : message.guild;
    const channel = isSlashCommand ? interaction.channel : message.channel;
    const dbGuild = await prisma.guild.findUnique({ where: { id: message.guildId } });

    const prefix = dbGuild.prefix;

    let command;

    if (isSlashCommand) command = interaction.commandName;
    else command = message.content.trim().split(/ +/g)[0];

    const isMusicChannel = channel.id == dbGuild.musicChannel;

    if (!isMusicChannel && !isSlashCommand && musicCommands.includes(command)) return false;

    if (!isMusicChannel && (musicCommands.includes(command.substring(prefix.length)) || musicCommands.includes(command))) {
        await utils.reply(interaction, channel, 'This command cannot be used here!');
        return true;
    }

    if (!isSlashCommand) {
        setTimeout(() => {
            if (!message.pinned) {
                message.delete()
                    // eslint-disable-next-line no-inline-comments
                    .catch(() => { /* message already deleted */ });
            }
        }, 5000);
    }

    if (ytRegex.test(command)) {
        try {
            client.commands.get('play').execute(client, interaction, message, ['play', command]);
        }
        catch (error) {
            console.error(error);
            await utils.reply(null, message.channel, 'An error occurred while executing that command!');
        }
        utils.refreshMusicEmbed(guild);
        return true;
    }

    if (musicCommands.includes(command) || musicCommands.includes(command.substring(prefix.length))) {
        if (command.startsWith(prefix)) command = command.substring(prefix.length);
        try {
            client.commands.get(command).execute(client, interaction, message, message?.content?.split(/ +/g));
        }
        catch (error) {
            console.error(error);
            await utils.reply(null, message.channel, 'An error occurred while executing that command!');
        }
        utils.refreshMusicEmbed(guild);
        return true;
    }

    return false;
};
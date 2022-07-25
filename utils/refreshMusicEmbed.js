const { EmbedBuilder } = require('discord.js');
const Vibrant = require('node-vibrant');

module.exports = async (db, guild) => {
    const guildId = guild.id;
    const music = db.get(`server.${guildId}.music`);
    const currentVideo = music.queue[0];

    const playerEmbed = new EmbedBuilder();
    let prominentColor = [0, 0, 0];
    if (currentVideo) {
        prominentColor = (await Vibrant.from(currentVideo.thumbnail).getPalette()).Vibrant._rgb;

        playerEmbed.setTitle(currentVideo.title);
        playerEmbed.setURL('https://www.youtube.com/watch?v=' + currentVideo.videoId);
        playerEmbed.setImage(currentVideo.thumbnail);

    }
    else {
        playerEmbed.setTitle('No music playing');
        playerEmbed.setImage('https://i.ibb.co/ySSNVP7/Discord-Music-Bot-Help-Embed.png');
    }

    playerEmbed.setColor(prominentColor);
    playerEmbed.setTimestamp();

    const musicChannel = guild.channels.cache.find(channel => channel.id === db.get(`server.${guildId}.conf.musicChannel`));
    const playerEmbedMessage = await musicChannel.messages.fetch(music.playerEmbedId)
        .catch(() => null);

    if (!playerEmbedMessage) {
        musicChannel
            .send({ embeds: [playerEmbed] })
            .then(message => {
                db.set(`server.${guildId}.music.playerEmbedId`, message.id);
                message.pin();
            });
    }
    else {
        playerEmbedMessage.edit({ embeds: [playerEmbed] });
    }
};
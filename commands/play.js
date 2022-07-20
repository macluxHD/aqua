const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const ytdl = require('discord-ytdl-core');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play indicated song!'),
    async execute(interaction) {

        // TODO: Get data / update embed etc..

        const player = createAudioPlayer();
        const resource = createAudioResource(ytdl('https://www.youtube.com/watch?v=Lok8xSsn9jw', { filter: 'audioonly', opusEncoded: true }), { inlineVolume: true });
        resource.volume.setVolume(0.3);

        player.play(resource);

        // join voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply('You need to be in a voice channel to use this command!');
            return;
        }
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        connection.subscribe(player);
        await interaction.reply('Playing!');
    },
};
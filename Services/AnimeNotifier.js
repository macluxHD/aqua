const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment');
const { EmbedBuilder } = require('discord.js');

const cron = require('node-cron');

const superagent = require('superagent');

function init(client) {
    // TODO: Ability to configure this per server
    cron.schedule('0 9 * * * ', () => notify(client));
}

async function notify(client, dayOfTheWeek) {
    if (typeof (dayOfTheWeek) == 'undefined') {
        dayOfTheWeek = moment().day();
    }

    const guilds = await prisma.Guild.findMany();

    guilds.forEach(async guild => {
        if (guild.aniNotifChannelId === null) return;

        // fetch all scheduled anime for this guild and put them in an array
        const animes = await prisma.Anime.findMany({
            where: {
                guildId: guild.id,
            },
        });

        // Fetch the anime airing currently
        let animeSchedules = await superagent.get('https://animeschedule.net/api/v3/timetables/sub')
            .query({ 'week': moment().week() })
            .query({ 'year': new Date().getFullYear() })
            .query({ 'tz': 'UTC' })
            .set('Authorization', 'Bearer ' + process.env.ANIME_SCHEDULE_API_KEY)
            .then(res => {
                return res.body;
            })
            .catch(err => {
                console.log(err);
            });

        // filter out the animes which we want to display based on the settings of the guild
        if (guild.aniNotifisBlacklist && animes.length !== 0) {
            animeSchedules = animeSchedules.filter(anime => {
                return animes.find(a => a.anischeduleRoute == anime.route) === undefined;
            });
        }
        else if (!guild.aniNotifisBlacklist) {
            if (animes.length === 0) return;

            animeSchedules = animeSchedules.filter(anime => {
                return animes.find(a => a.anischeduleRoute == anime.route) !== undefined;
            });
        }


        // filter out the animes which are airing on a different day
        animeSchedules = animeSchedules.filter(anime => {
            return moment(anime.episodeDate).day() == dayOfTheWeek && anime.airingStatus !== 'delayed-air';
        });

        // fetch the channel where we want to send the notifications
        const aniNotifChannel = await client.channels.fetch(guild.aniNotifChannelId);

        if (animeSchedules.length === 0) {
            aniNotifChannel.send(`No relevant anime airing today (${moment().day(dayOfTheWeek).format('dddd')})`);
            return;
        }

        aniNotifChannel.send(`Anime airing today (${moment().day(dayOfTheWeek).format('dddd')})`);

        // send the notifications
        for (const anime of animeSchedules) {
            // Gather more info about the anime
            const moreInfo = (await superagent.get('https://animeschedule.net/api/v3/anime/' + anime.route).set('Authorization', 'Bearer ' + process.env.ANIME_SCHEDULE_API_KEY)).body;

            const embed = new EmbedBuilder()
                .setTitle(anime.title)
                .setURL('https://' + moreInfo.websites.aniList)
                .setThumbnail('https://img.animeschedule.net/production/assets/public/img/' + anime.imageVersionRoute)
                .addFields(
                    { name: 'Air time', value: `<t:${moment.utc(anime.episodeDate).unix()}:R>` },
                )
                .setFooter({ text: 'Powered by animeschedule.net' })
                .setColor('#00b0f4');
            await aniNotifChannel.send({ embeds: [embed] });
        }
    });
}

// Handles reactions on the anime notifications
async function react(reaction) {
    if (reaction.emoji.name === '❌') {
        const animeId = reaction.message.embeds[0].data.url?.match(/\/anime\/(\d+)/)[1];

        if (typeof (animeId) == 'undefined') {
            reaction.message.channel.send('Error while fetching anime id!');
        }
        reaction.message.channel.send(`Removing anime with id ${animeId} from the list...`);

        const guild = await prisma.guild.findUnique({ where: { id: reaction.message.guild.id } });

        if (guild.aniNotifisBlacklist) {
            // check if anime is already on the list
            const anime = await prisma.anime.findFirst({
                where: {
                    guildId: reaction.message.guild.id,
                    animeId: animeId,
                },
            });

            if (anime != null) return;

            const route = await superagent.get('https://animeschedule.net/api/v3/anime')
                .query({ 'anilist-ids': animeId })
                .then(res => {
                    return res.body.anime[0].route;
                })
                .catch(() => {
                    reaction.message.channel.send(`Error while fetching anime with id ${animeId}, may not exist!`);
                    return false;
                });

            if (!route) return;

            await prisma.anime.create({
                data: {
                    guildId: reaction.message.guild.id,
                    animeId: animeId,
                    anischeduleRoute: route,
                },
            });
        }
        else {
            const anime = await prisma.anime.findFirst({
                where: {
                    guildId: reaction.message.guild.id,
                    animeId: animeId,
                },
            });

            if (anime == null) return;

            await prisma.anime.delete({
                where: {
                    id: anime.id,
                },
            });
        }
    }
}

module.exports = {
    init,
    notify,
    react,
};

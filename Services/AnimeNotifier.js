const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment');
const { EmbedBuilder } = require('discord.js');

const { Cron, scheduledJobs } = require('croner');

const superagent = require('superagent');

async function init(client) {
    const guilds = await prisma.Guild.findMany();

    guilds.forEach(async guild => {
        Cron(guild.aniNotifSchedule, { name: guild.id }, () => notify(client, null, guild));
    });
}

async function notify(client, dayOfTheWeek, guild) {
    if (typeof (dayOfTheWeek) == 'undefined' || dayOfTheWeek === null) {
        dayOfTheWeek = moment().day();
    }

    if (guild.aniNotifChannelId === null) return;

    // fetch all scheduled anime for this guild and put them in an array
    const animes = await prisma.Anime.findMany({
        where: {
            guildId: guild.id,
        },
    });

    // Fetch the anime airing currently
    // TODO: Potentially allow for dubs and raw to be fetched as well
    const animeSchedules = await superagent.get('https://animeschedule.net/api/v3/timetables/sub')
        .query({ 'week': moment().day() == 0 ? moment().week() - 1 : moment().week() })
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
    let filteredAnimeSchedules = animeSchedules;
    if (guild.aniNotifisBlacklist && animes.length !== 0) {
        filteredAnimeSchedules = animeSchedules.filter(anime => {
            return animes.find(a => a.anischeduleRoute == anime.route) === undefined;
        });
    }
    else if (!guild.aniNotifisBlacklist) {
        if (animes.length === 0) return;

        filteredAnimeSchedules = animeSchedules.filter(anime => {
            return animes.find(a => a.anischeduleRoute == anime.route) !== undefined;
        });
    }

    // filter out the animes which are airing on a different day
    filteredAnimeSchedules = filteredAnimeSchedules.filter(anime => {
        return moment(anime.episodeDate).day() == dayOfTheWeek && anime.airingStatus !== 'delayed-air';
    });

    // fetch the channel where we want to send the notifications
    const aniNotifChannel = await client.channels.fetch(guild.aniNotifChannelId).catch(() => { return; });
    if (typeof (aniNotifChannel) === 'undefined') return;

    if (filteredAnimeSchedules.length === 0) {
        aniNotifChannel.send(`No relevant anime airing on ${moment().day(dayOfTheWeek).format('dddd')}`);
        return;
    }

    aniNotifChannel.send(`Anime airing on ${moment().day(dayOfTheWeek).format('dddd')}`);

    // send the notifications
    for (const anime of filteredAnimeSchedules) {
        // Gather more info about the anime
        const moreInfo = (await superagent.get('https://animeschedule.net/api/v3/anime/' + anime.route).set('Authorization', 'Bearer ' + process.env.ANIME_SCHEDULE_API_KEY)).body;

        const animeId = moreInfo.websites.aniList.match(/\/anime\/(\d+)/)[1];
        let airtime = moment.utc(anime.episodeDate);

        // Fix for animes which air on sunday
        if (dayOfTheWeek === 0) {
            airtime = airtime.subtract(7, 'days');
        }

        const embed = new EmbedBuilder()
            .setTitle(anime.title)
            .setURL('https://' + moreInfo.websites.aniList)
            .setThumbnail('https://img.animeschedule.net/production/assets/public/img/' + anime.imageVersionRoute)
            .addFields(
                { name: 'Air time', value: `<t:${airtime.unix()}:R>` },
            )
            .setFooter({ text: 'Powered by animeschedule.net' })
            .setAuthor({ name: animeId })
            .setColor('#00b0f4');
        await aniNotifChannel.send({ embeds: [embed] });
    }

    // Cleanup the database if the anime is no longer airing
    const animeRoutes = animeSchedules.map(a => a.route);
    if (guild.aniNotifisBlacklist) {
        // delete all anime which are on the blacklist but not in animeRoutes and delete them
        await prisma.Anime.deleteMany({
            where: {
                guildId: guild.id,
                NOT: {
                    anischeduleRoute: {
                        in: animeRoutes,
                    },
                },
            },
        });
    }
    // delete every anime on the whitelist which has aired in the past and is finished airing
    else {
        // fetch every anime in the db using the animeschudle api
        const premiers = [];

        for (const anime of animes) {
            await superagent.get('https://animeschedule.net/api/v3/anime/' + anime.anischeduleRoute)
                .set('Authorization', 'Bearer ' + process.env.ANIME_SCHEDULE_API_KEY)
                .then(res => {
                    premiers.push({ route: res.body.route, premier: res.body.premier });
                })
                .catch(err => {
                    console.log(err);
                });
        }

        // only keep the animes which are airing in the future
        const futurePremiers = premiers.filter(p => {
            console.log(p);
            return moment.utc(p.premier).isAfter(moment()) || p.premier === '0001-01-01T00:00:00Z';
        });

        // add future premiers into filteredAnimeRoutes
        futurePremiers.forEach(p => {
            animeRoutes.push(p.route);
        });

        // delete all anime which are on the whitelist but which are not airing anymore
        await prisma.Anime.deleteMany({
            where: {
                guildId: guild.id,
                NOT: {
                    anischeduleRoute: {
                        in: animeRoutes,
                    },
                },
            },
        });
    }
}

// Handles reactions on the anime notifications
async function react(client, reaction) {
    if (reaction.emoji.name === '❌' && reaction.message.author.id === client.user.id) {
        const animeId = reaction.message.embeds[0].data.url?.match(/\/anime\/(\d+)/)[1];

        if (typeof (animeId) == 'undefined') {
            reaction.message.channel.send('Error while fetching anime id!');
        }

        const guild = await prisma.guild.findUnique({ where: { id: reaction.message.guild.id } });

        if (guild.aniNotifisBlacklist) {
            reaction.message.channel.send(`Adding anime with id ${animeId} to the blacklist...`);
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
            reaction.message.channel.send(`Removing anime with id ${animeId} from the whitelist...`);
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

// Restarts the cron job for the guild
async function restartCronJob(client, guildId) {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });

    if (typeof (guild) === 'undefined') return;

    scheduledJobs.find(j => j.name === guildId).stop();
    Cron(guild.aniNotifSchedule, { name: guild.id }, () => notify(client, null, guild));
}

module.exports = {
    init,
    notify,
    react,
    restartCronJob,
};

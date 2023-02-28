[![license](https://img.shields.io/github/license/macluxHD/aqua)](https://github.com/macluxHD/aqua/blob/main/LICENSE)

# aqua

## Installation

First of all clone the repo using

`git clone https://github.com/macluxHD/aqua`

Rename the [.env.example](https://github.com/macluxHD/aqua/blob/main/.env.example) file to `.env` and fill out the variables as follows:

- `TOKEN` can be acquired from the [Discord Developer Portal](https://discord.com/developers) in your application in the Bot subpage.
- `clientId` is also available on the [Discord Developer Portal](https://discord.com/developers) in the General Information subpage called and application ID
- `YOUTUBE_API_KEY` can be generated by creating a project on googles' API page here is a guide on how to do it. [How To Get a YouTube API Key](https://rapidapi.com/blog/how-to-get-youtube-api-key/)

Now run the following command to register the slash commands. This step is optional and can be omitted if you do not wanna use slash commands.

`node deploy-commands.js`

Finally you can start the bot using the following command.

`npm start`

To invite the bot use the following Link and replace the your-client-id with the application ID from the [Discord Developer Portal](https://discord.com/developers)

`https://discord.com/api/oauth2/authorize?client_id=your-client-id&permissions=8&scope=bot%20applications.commands`

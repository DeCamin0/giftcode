const { SlashCommandBuilder } = require('discord.js');

const db = require('../db/queries');

const { fetchJeabPlayer, setJeabsApiToken } = require('../services/jeabsPlayer');

const { messages } = require('../utils/messages');

const { spanishLocales } = require('../utils/commandLocales');

const { requireAdmin } = require('../utils/permissions');



module.exports = {

  data: new SlashCommandBuilder()

    .setName('setjeabtoken')

    .setDescription('Set JEABS API token for /getinfo (Admin only)')

    .setDescriptionLocalizations(

      spanishLocales('Configura el token JEABS para /getinfo (solo Admin)')

    )

    .addStringOption((option) =>

      option

        .setName('token')

        .setDescription('X-API-Token from kingshot.jeab.dev DevTools')

        .setDescriptionLocalizations(

          spanishLocales('X-API-Token desde DevTools en kingshot.jeab.dev')

        )

        .setRequired(true)

    ),



  async execute(interaction) {

    if (!(await requireAdmin(interaction))) return;



    const token = interaction.options.getString('token', true).trim();

    if (token.length < 8) {

      await interaction.reply({

        content: messages.setjeabtoken.invalid,

        ephemeral: true,

      });

      return;

    }



    await interaction.deferReply({ ephemeral: true });



    const registered = await db.getPlayerByDiscordId(interaction.user.id);

    const testPlayerId = registered?.player_id || '265681775';

    const test = await fetchJeabPlayer(testPlayerId, token);



    if (!test.ok) {

      await interaction.editReply({

        content:

          test.code === 'AUTH_EXPIRED'

            ? messages.setjeabtoken.rejected

            : messages.setjeabtoken.testFailed(test.message),

      });

      return;

    }



    setJeabsApiToken(token);



    await interaction.editReply({

      content: messages.setjeabtoken.success(test.profile?.nickname || testPlayerId),

    });

  },

};


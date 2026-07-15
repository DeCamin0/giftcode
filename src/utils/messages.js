/**
 * Mesaje Discord în engleză + spaniolă.
 */
function bilingual(en, es) {
  return `🇬🇧 ${en}\n🇪🇸 ${es}`;
}

const messages = {
  genericError: bilingual(
    'An error occurred while running this command.',
    'Ocurrió un error al ejecutar este comando.'
  ),

  register: {
    invalidId: bilingual(
      'Invalid Player ID. Send only your in-game number (e.g. `12345678`).',
      'Player ID inválido. Envía solo tu número del juego (ej. `12345678`).'
    ),
    alreadyRegistered: (playerId) =>
      bilingual(
        `You are already registered with \`${playerId}\`.\nUse \`/removeid\` to change it.`,
        `Ya estás registrado con \`${playerId}\`.\nUsa \`/removeid\` para cambiarlo.`
      ),
    playerIdTaken: bilingual(
      'This Player ID is already used by another member.',
      'Este Player ID ya está en uso por otro miembro.'
    ),
    playerNotFound: bilingual(
      'This Player ID does not exist in Kingshot. Check the number in-game.',
      'Este Player ID no existe en Kingshot. Verifica el número en el juego.'
    ),
    registerError: bilingual(
      'Registration failed. Contact an admin.',
      'Error al registrarse. Contacta a un admin.'
    ),
    success: (playerId, discordName, profile) => {
      const gameLines = [];
      if (profile?.nickname) {
        gameLines.push(`**In-game name | Nombre en juego:** ${profile.nickname}`);
      }
      if (profile?.kingdomId) {
        gameLines.push(`**Kingdom | Reino:** ${profile.kingdomId}`);
      }
      if (profile?.townLevel) {
        gameLines.push(`**Town level | Nivel ciudad:** ${profile.townLevel}`);
      }
      if (profile?.avatar) {
        gameLines.push(`**Avatar ID:** \`${profile.avatar}\``);
      }
      const gameBlock = gameLines.length ? `\n${gameLines.join('\n')}` : '';

      return bilingual(
        `Registered!\n**Player ID:** \`${playerId}\`\n**Discord:** ${discordName}${gameBlock}`,
        `¡Registrado!\n**Player ID:** \`${playerId}\`\n**Discord:** ${discordName}${gameBlock}`
      );
    },
  },

  myid: {
    notRegistered: bilingual(
      'You are not registered. Use `/register` or send your Player ID in chat.',
      'No estás registrado. Usa `/register` o envía tu Player ID en el chat.'
    ),
    info: (player) => {
      const lines = [
        bilingual('**Your info:**', '**Tu información:**'),
        `**Player ID:** \`${player.player_id}\``,
        `**Discord:** ${player.discord_name}`,
      ];

      if (player.game_nickname) {
        lines.push(`**In-game name | Nombre en juego:** ${player.game_nickname}`);
      }
      if (player.kingdom_id) {
        lines.push(`**Kingdom | Reino:** ${player.kingdom_id}`);
      }
      if (player.town_level) {
        lines.push(`**Town level | Nivel ciudad:** ${player.town_level}`);
      }
      if (player.game_avatar) {
        lines.push(`**Avatar ID:** \`${player.game_avatar}\``);
      }

      lines.push(
        bilingual(
          `**Registered:** <t:${Math.floor(new Date(player.registered_at).getTime() / 1000)}:R>`,
          `**Registrado:** <t:${Math.floor(new Date(player.registered_at).getTime() / 1000)}:R>`
        )
      );

      return lines.join('\n');
    },
  },

  removeid: {
    notFound: bilingual(
      'You have no Player ID registered.',
      'No tienes ningún Player ID registrado.'
    ),
    success: bilingual(
      'Your Player ID was removed. You can register again with `/register` or by sending your ID in chat.',
      'Tu Player ID fue eliminado. Puedes registrarte de nuevo con `/register` o enviando tu ID en el chat.'
    ),
  },

  getinfo: {
    noIdProvided: bilingual(
      'Provide a `player_id` or register first with `/register`.',
      'Indica un `player_id` o regístrate primero con `/register`.'
    ),
    invalidId: bilingual(
      'Invalid Player ID. Use a numeric in-game ID (e.g. `12345678`).',
      'Player ID inválido. Usa un número del juego (ej. `12345678`).'
    ),
    playerNotFound: bilingual(
      'Player not found in Kingshot.',
      'Jugador no encontrado en Kingshot.'
    ),
    fetchFailed: bilingual(
      'Could not fetch player info. Try again later.',
      'No se pudo obtener la información. Inténtalo más tarde.'
    ),
    jeabTokenExpired: bilingual(
      'JEABS token expired. Admin: use `/setjeabtoken` or refresh `JEABS_API_TOKEN` in `.env`.',
      'Token JEABS expirado. Admin: usa `/setjeabtoken` o actualiza `JEABS_API_TOKEN` en `.env`.'
    ),
  },

  setjeabtoken: {
    noPermission: bilingual(
      'Only admins can set the JEABS token.',
      'Solo los admins pueden configurar el token JEABS.'
    ),
    invalid: bilingual(
      'Token too short. Copy the full `X-API-Token` from browser DevTools.',
      'Token demasiado corto. Copia el `X-API-Token` completo desde DevTools.'
    ),
    rejected: bilingual(
      'Token rejected by JEABS (401). Open jeab.dev, search a player, copy a fresh `X-API-Token`.',
      'Token rechazado por JEABS (401). Abre jeab.dev, busca un jugador y copia un `X-API-Token` nuevo.'
    ),
    testFailed: (detail) =>
      bilingual(
        `Token test failed: ${detail}`,
        `Prueba de token fallida: ${detail}`
      ),
    success: (name) =>
      bilingual(
        `JEABS token saved and verified (test player: **${name}**). \`/getinfo\` now includes alliance and stats. No bot restart needed.`,
        `Token JEABS guardado y verificado (jugador prueba: **${name}**). \`/getinfo\` ahora incluye alianza y stats. Sin reiniciar el bot.`
      ),
  },

  permissions: {
    noAdmin: bilingual(
      'No permission. You need a bot admin role, `/addadmin` entry, or `OWNER_USER_IDS`.',
      'Sin permiso. Necesitas rol admin del bot, entrada en `/addadmin` o `OWNER_USER_IDS`.'
    ),
    noOwner: bilingual(
      'No permission. Only the bot owner (`OWNER_USER_IDS`) can use this command.',
      'Sin permiso. Solo el dueño del bot (`OWNER_USER_IDS`) puede usar este comando.'
    ),
  },

  botAdmins: {
    cannotTargetBot: bilingual(
      'You cannot add a bot as admin.',
      'No puedes añadir un bot como admin.'
    ),
    alreadyAdmin: (username) =>
      bilingual(
        `**${username}** is already a bot admin.`,
        `**${username}** ya es admin del bot.`
      ),
    added: (username, userId) =>
      bilingual(
        `**${username}** (\`${userId}\`) is now a bot admin.`,
        `**${username}** (\`${userId}\`) ahora es admin del bot.`
      ),
    notFound: (username) =>
      bilingual(
        `**${username}** is not in the bot admin list.`,
        `**${username}** no está en la lista de admins del bot.`
      ),
    removed: (username, userId) =>
      bilingual(
        `**${username}** (\`${userId}\`) was removed from bot admins.`,
        `**${username}** (\`${userId}\`) fue eliminado de los admins del bot.`
      ),
    listEmpty: bilingual(
      'No bot admins in the database. Use `/addadmin` or set `ADMIN_ROLE_IDS` / `OWNER_USER_IDS`.',
      'No hay admins del bot en la base de datos. Usa `/addadmin` o configura `ADMIN_ROLE_IDS` / `OWNER_USER_IDS`.'
    ),
    listHeader: bilingual('**Bot admins (database)**', '**Admins del bot (base de datos)**'),
    listLine: (row) => {
      const ts = Math.floor(new Date(row.added_at).getTime() / 1000);
      return `• <@${row.discord_user_id}> — \`${row.discord_username}\` — <t:${ts}:d>`;
    },
    dbError: bilingual(
      'Database error while managing bot admins. Contact the bot owner.',
      'Error de base de datos al gestionar admins. Contacta al dueño del bot.'
    ),
  },

  playerAdmin: {
    typeManual: 'manual list',
    typeLinked: 'Discord',
    missingTarget: bilingual(
      'Provide `player_id` and/or `user` to remove.',
      'Indica `player_id` y/o `user` para eliminar.'
    ),
    removed: (playerId, label) =>
      bilingual(
        `Removed from redeem list: \`${playerId}\` (${label}).`,
        `Eliminado de la lista de canje: \`${playerId}\` (${label}).`
      ),
    notFound: bilingual(
      'Player not found in the redeem list.',
      'Jugador no encontrado en la lista de canje.'
    ),
    playerIdTaken: (playerId, label) =>
      bilingual(
        `Player ID \`${playerId}\` is already in the list (${label || 'unknown'}).`,
        `El Player ID \`${playerId}\` ya está en la lista (${label || 'desconocido'}).`
      ),
    discordAlreadyRegistered: (username, playerId) =>
      bilingual(
        `**${username || 'User'}** is already linked to Player ID \`${playerId}\`.`,
        `**${username || 'Usuario'}** ya está vinculado al Player ID \`${playerId}\`.`
      ),
    dbError: bilingual(
      'Database error while updating the player list.',
      'Error de base de datos al actualizar la lista de jugadores.'
    ),
  },

  listplayers: {
    title: '📋 Registered players | Jugadores registrados',
    empty: bilingual(
      'No players on the redeem list yet. Use `/register` or `/addplayer`.',
      'No hay jugadores en la lista de canje. Usa `/register` o `/addplayer`.'
    ),
    footer: (count) => `Total: ${count}`,
    dbError: bilingual(
      'Could not load the player list. Try again later.',
      'No se pudo cargar la lista de jugadores. Inténtalo más tarde.'
    ),
  },

  codes: {
    none: bilingual(
      'No active gift codes found right now.',
      'No se encontraron códigos activos en este momento.'
    ),
    embedTitle: '🎁 Active Kingshot Codes | Códigos activos Kingshot',
    embedFooter: 'Sources | Fuentes: kingshot.net + jeab.dev',
    expires: (timestamp) => ` — expires | expira <t:${timestamp}:R>`,
    fetchError: bilingual(
      'Could not fetch gift codes. Try again later.',
      'No se pudieron obtener los códigos. Inténtalo más tarde.'
    ),
  },

  redeem: {
    disabled: bilingual(
      '**Automatic redeem is disabled** on this server (Kingshot Terms of Service).\nRedeem codes manually: https://ks-giftcode.centurygame.com/\nOr: https://kingshot.net/gift-codes/redeem',
      '**El canje automático está desactivado** en este servidor (Términos de Kingshot).\nCanjea manualmente: https://ks-giftcode.centurygame.com/\nO: https://kingshot.net/gift-codes/redeem'
    ),
    notRegistered: bilingual(
      'You must register first with `/register` or by sending your Player ID.',
      'Debes registrarte primero con `/register` o enviando tu Player ID.'
    ),
    alreadyProcessed: (status) =>
      bilingual(
        `This code was already processed for you: **${status}**`,
        `Este código ya fue procesado para ti: **${status}**`
      ),
    error: (err) =>
      bilingual(`Redeem error: ${err}`, `Error al canjear: ${err}`),
  },

  redeemall: {
    noPermission: bilingual(
      'No permission. This command is for R4/Admin only.',
      'Sin permiso. Este comando es solo para R4/Admin.'
    ),
    disabled: bilingual(
      'Bulk redeem is disabled (Kingshot Terms of Service). Members must redeem codes manually.',
      'Canje masivo desactivado (Términos de Kingshot). Los miembros deben canjear manualmente.'
    ),
    noPlayers: bilingual(
      'No registered players found.',
      'No hay jugadores registrados.'
    ),
    busy: bilingual(
      'A redeem job is already running. Wait for it to finish.',
      'Ya hay un canje en curso. Espera a que termine.'
    ),
    failed: bilingual(
      'Redeemall could not start.',
      'No se pudo iniciar el canje masivo.'
    ),
    started: (count, code, minDelay, maxDelay) =>
      bilingual(
        `Starting redeem for **${count}** players...\nCode: \`${code}\`\nDelay: ${minDelay}-${maxDelay}s between each.`,
        `Iniciando canje para **${count}** jugadores...\nCódigo: \`${code}\`\nRetraso: ${minDelay}-${maxDelay}s entre cada uno.`
      ),
    stopped: (reason) =>
      bilingual(`Stopped: ${reason}`, `Detenido: ${reason}`),
    summary: (code, success, already, skipped, failed) =>
      [
        bilingual('**Redeemall results**', '**Resultados redeemall**'),
        `**Code | Código:** \`${code}\``,
        `✅ ${bilingual('Success', 'Éxito')}: ${success}`,
        `ℹ️ ${bilingual('Already used', 'Ya usado')}: ${already}`,
        `⏭️ ${bilingual('Skipped', 'Omitido')}: ${skipped}`,
        `❌ ${bilingual('Failed', 'Fallido')}: ${failed}`,
      ].join('\n'),
  },

  giftCode: {
    newCode: (code, expiryLine) =>
      [
        bilingual('**New Kingshot gift code detected!**', '**¡Nuevo código de regalo Kingshot detectado!**'),
        `\`\`\`${code}\`\`\``,
        expiryLine || '',
        bilingual(
          'Redeem this code manually in-game or at https://ks-giftcode.centurygame.com/',
          'Canjea este código manualmente en el juego o en https://ks-giftcode.centurygame.com/'
        ),
        bilingual(
          'Register with `/register` or ask an admin for `/addplayer` to join the alliance list.',
          'Regístrate con `/register` o pide a un admin `/addplayer` para unirte a la lista de la alianza.'
        ),
      ]
        .filter(Boolean)
        .join('\n'),
    autoRedeemSummary: (code, success, already, skipped, failed) =>
      [
        bilingual('**Auto-redeem finished**', '**Canje automático terminado**'),
        `**Code | Código:** \`${code}\``,
        `✅ ${bilingual('Success', 'Éxito')}: ${success}`,
        `ℹ️ ${bilingual('Already used', 'Ya usado')}: ${already}`,
        `⏭️ ${bilingual('Skipped', 'Omitido')}: ${skipped}`,
        `❌ ${bilingual('Failed', 'Fallido')}: ${failed}`,
      ].join('\n'),
    newPlayerRedeemSummary: (summary) => {
      const lines = [
        bilingual(
          '**Auto-redeem for new player**',
          '**Canje automático para nuevo jugador**'
        ),
        `**Player ID:** \`${summary.playerId}\``,
        `✅ ${bilingual('Redeemed', 'Canjeado')}: ${summary.success}`,
      ];
      if (summary.already) {
        lines.push(`ℹ️ ${bilingual('Already used', 'Ya usado')}: ${summary.already}`);
      }
      if (summary.unavailable) {
        lines.push(`🚫 ${bilingual('Max uses reached', 'Máximo alcanzado')}: ${summary.unavailable}`);
      }
      if (summary.expired) {
        lines.push(`⏰ ${bilingual('Expired', 'Expirado')}: ${summary.expired}`);
      }
      if (summary.skipped) {
        lines.push(`⏭️ ${bilingual('Skipped', 'Omitido')}: ${summary.skipped}`);
      }
      if (summary.failed) {
        lines.push(`❌ ${bilingual('Failed', 'Fallido')}: ${summary.failed}`);
      }
      lines.push(
        bilingual(
          `Checked ${summary.total} active code(s) — check your in-game mail.`,
          `Se revisaron ${summary.total} código(s) activo(s) — revisa tu correo en el juego.`
        )
      );
      return lines.join('\n');
    },
    expires: (timestamp) =>
      bilingual(
        `Expires: <t:${timestamp}:F>`,
        `Expira: <t:${timestamp}:F>`
      ),
  },

  scheduler: {
    statusTitle: '⏱️ Scheduler status | Estado del programador',
    busy: bilingual(
      'A code check is already running. Try again in a minute.',
      'Ya hay una verificación en curso. Inténtalo en un minuto.'
    ),
    checkDone: (codes) => {
      if (!codes.length) {
        return bilingual(
          'Code check complete — no new codes found.',
          'Verificación completa — no hay códigos nuevos.'
        );
      }
      return bilingual(
        `Code check complete — **${codes.length}** new code(s): ${codes.map((c) => `\`${c}\``).join(', ')}`,
        `Verificación completa — **${codes.length}** código(s) nuevo(s): ${codes.map((c) => `\`${c}\``).join(', ')}`
      );
    },
    checkFailed: (detail) =>
      bilingual(
        `Code check failed: ${detail}`,
        `Verificación fallida: ${detail}`
      ),
  },

  lastcodes: {
    title: '🎁 Recent gift codes | Códigos recientes',
    empty: bilingual(
      'No gift codes in database yet.',
      'Aún no hay códigos en la base de datos.'
    ),
    error: bilingual(
      'Could not load gift codes.',
      'No se pudieron cargar los códigos.'
    ),
    line: (row) => {
      const seenTs = row.first_seen_at
        ? Math.floor(new Date(row.first_seen_at).getTime() / 1000)
        : null;
      const announcedTs = row.announced_at
        ? Math.floor(new Date(row.announced_at).getTime() / 1000)
        : null;
      const seen = seenTs ? `<t:${seenTs}:d>` : '?';
      const announced = announcedTs ? `<t:${announcedTs}:d>` : '—';
      return `• \`${row.code}\` — seen ${seen} — announced ${announced}`;
    },
  },

  kingshotRedeem: {
    40001: bilingual('Invalid or non-existent Player ID', 'Player ID inválido o inexistente'),
    40004: bilingual('Invalid request', 'Solicitud inválida'),
    40007: bilingual('Code expired', 'Código expirado'),
    40005: bilingual(
      'This gift code has reached its maximum uses (global limit — not your account)',
      'Este código alcanzó el máximo de usos (límite global — no es tu cuenta)'
    ),
    40008: bilingual('Code already used on this account', 'Código ya usado en esta cuenta'),
    40011: bilingual('Code already used (duplicate)', 'Código ya usado (duplicado)'),
    40014: bilingual('Code not found or invalid', 'Código no encontrado o inválido'),
    20000: bilingual('Redeem successful', 'Canje exitoso'),
    disabled: bilingual(
      'Redeem disabled — Kingshot Terms of Service prohibit automated redemption',
      'Canje desactivado — los Términos de Kingshot prohíben el canje automático'
    ),
    loginFailed: bilingual('Player login failed', 'Falló el inicio de sesión del jugador'),
    success: bilingual(
      'Redeem successful — check your in-game mail',
      'Canje exitoso — revisa tu correo en el juego'
    ),
    invalidCode: bilingual(
      'Invalid code — check spelling (case-sensitive)',
      'Código inválido — revisa la ortografía (sensible a mayúsculas)'
    ),
    expiredCode: bilingual('Code expired', 'Código expirado'),
    unknownError: (code) =>
      bilingual(`Unknown error (${code})`, `Error desconocido (${code})`),
  },
};

function redeemErrorMessage(errCode, fallback) {
  if (messages.kingshotRedeem[errCode]) {
    return messages.kingshotRedeem[errCode];
  }
  return fallback || messages.kingshotRedeem.unknownError(errCode ?? '?');
}

module.exports = {
  bilingual,
  messages,
  redeemErrorMessage,
};

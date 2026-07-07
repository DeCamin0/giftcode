-- Baza de date pentru Kingshot Alliance Bot
-- Rulează: mysql -u root -p < sql/schema.sql

CREATE DATABASE IF NOT EXISTS kingshot_alliance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kingshot_alliance;

-- Jucători înregistrați: un Player ID per Discord user
CREATE TABLE IF NOT EXISTS players (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_id        VARCHAR(32)  NOT NULL,
  discord_name      VARCHAR(128) NOT NULL,
  player_id         VARCHAR(32)  NOT NULL,
  game_nickname     VARCHAR(128) NULL,
  game_avatar       VARCHAR(512) NULL,
  kingdom_id        VARCHAR(32)  NULL,
  town_level        INT UNSIGNED NULL,
  game_profile_json JSON         NULL,
  registered_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_discord_id (discord_id),
  UNIQUE KEY uq_player_id (player_id)
) ENGINE=InnoDB;

-- Coduri detectate de pe kingshot.net
CREATE TABLE IF NOT EXISTS gift_codes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(64)  NOT NULL,
  expires_at  DATETIME     NULL,
  source_id   INT UNSIGNED NULL COMMENT 'ID din API kingshot.net',
  first_seen  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notified    TINYINT(1)   NOT NULL DEFAULT 0,
  UNIQUE KEY uq_code (code)
) ENGINE=InnoDB;

-- Rezultate redeem per jucător + cod (evită dubluri)
CREATE TABLE IF NOT EXISTS redeem_results (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id     VARCHAR(32)  NOT NULL,
  discord_id    VARCHAR(32)  NULL,
  gift_code     VARCHAR(64)  NOT NULL,
  status        ENUM('success', 'already_claimed', 'failed', 'skipped') NOT NULL,
  message       VARCHAR(512) NULL,
  redeemed_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_player_code (player_id, gift_code),
  KEY idx_gift_code (gift_code)
) ENGINE=InnoDB;

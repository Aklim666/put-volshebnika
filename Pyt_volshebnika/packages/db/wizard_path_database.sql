CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS players (
    id                   SERIAL       PRIMARY KEY,
    name                 TEXT         NOT NULL,
    password             TEXT         NOT NULL,
    avatar               TEXT         NOT NULL DEFAULT 'cat',
    compassion           INTEGER      NOT NULL DEFAULT 0,
    courage              INTEGER      NOT NULL DEFAULT 0,
    wisdom               INTEGER      NOT NULL DEFAULT 0,
    ambition             INTEGER      NOT NULL DEFAULT 0,
    principle            INTEGER      NOT NULL DEFAULT 0,
    completed_quests     TEXT         NOT NULL DEFAULT '[]',
    archetype_earned     TEXT         DEFAULT NULL,
    previous_archetypes  TEXT         NOT NULL DEFAULT '[]',
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT players_name_unique UNIQUE (name),
    CONSTRAINT players_compassion_range CHECK (compassion BETWEEN -100 AND 100),
    CONSTRAINT players_courage_range    CHECK (courage    BETWEEN -100 AND 100),
    CONSTRAINT players_wisdom_range     CHECK (wisdom     BETWEEN -100 AND 100),
    CONSTRAINT players_ambition_range   CHECK (ambition   BETWEEN -100 AND 100),
    CONSTRAINT players_principle_range  CHECK (principle  BETWEEN -100 AND 100),
    CONSTRAINT players_avatar_valid     CHECK (avatar IN ('cat', 'frog'))
);

CREATE TABLE IF NOT EXISTS conversations (
    id         SERIAL    PRIMARY KEY,
    title      TEXT      NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id              SERIAL    PRIMARY KEY,
    conversation_id INTEGER   NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    role            TEXT      NOT NULL,
    content         TEXT      NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT messages_role_valid CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_players_name ON players (name);
CREATE INDEX IF NOT EXISTS idx_players_name_trgm ON players USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_players_created_at ON players (created_at);

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_calculate_archetype(
    p_compassion INTEGER,
    p_courage    INTEGER,
    p_wisdom     INTEGER,
    p_ambition   INTEGER,
    p_principle  INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql AS
$$
DECLARE
    v_matches TEXT[] := '{}';
BEGIN
    IF p_compassion >= 6 AND p_courage >= 6 AND p_wisdom >= 6
       AND p_ambition >= 6 AND p_principle >= 6 THEN
        v_matches := array_append(v_matches, 'Наставник');
    END IF;

    IF p_ambition >= 7 AND p_compassion <= 3 THEN
        v_matches := array_append(v_matches, 'Мрак');
    END IF;

    IF p_ambition >= 6 AND p_compassion >= 5 THEN
        v_matches := array_append(v_matches, 'Властитель');
    END IF;

    IF p_compassion >= 6 AND p_courage <= 4 THEN
        v_matches := array_append(v_matches, 'Целитель');
    END IF;

    IF p_principle >= 6 AND p_compassion <= 4 THEN
        v_matches := array_append(v_matches, 'Борец за порядок');
    END IF;

    IF array_length(v_matches, 1) = 1 THEN
        RETURN v_matches[1];
    END IF;

    RETURN 'Искатель пути';
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_quest_stats(
    p_player_id        INTEGER,
    p_quest_id         INTEGER,
    p_compassion_delta INTEGER DEFAULT 0,
    p_courage_delta    INTEGER DEFAULT 0,
    p_wisdom_delta     INTEGER DEFAULT 0,
    p_ambition_delta   INTEGER DEFAULT 0,
    p_principle_delta  INTEGER DEFAULT 0,
    p_archetype_earned TEXT    DEFAULT NULL
)
RETURNS SETOF players
LANGUAGE plpgsql AS
$$
DECLARE
    v_completed   TEXT;
    v_quests      JSON;
    v_quest_ids   INTEGER[];
    v_new_quests  TEXT;
BEGIN
    SELECT completed_quests INTO v_completed
    FROM players WHERE id = p_player_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Игрок с id=% не найден', p_player_id;
    END IF;

    v_quest_ids := ARRAY(
        SELECT value::INTEGER
        FROM json_array_elements_text(v_completed::JSON)
    );

    IF p_quest_id > 0 AND NOT (p_quest_id = ANY(v_quest_ids)) THEN
        v_quest_ids := array_append(v_quest_ids, p_quest_id);
    END IF;

    SELECT json_agg(e)::TEXT
    INTO v_new_quests
    FROM unnest(v_quest_ids) AS e;

    v_new_quests := COALESCE(v_new_quests, '[]');

    RETURN QUERY
    UPDATE players SET
        compassion       = compassion + p_compassion_delta,
        courage          = courage    + p_courage_delta,
        wisdom           = wisdom     + p_wisdom_delta,
        ambition         = ambition   + p_ambition_delta,
        principle        = principle  + p_principle_delta,
        completed_quests = v_new_quests,
        archetype_earned = COALESCE(p_archetype_earned, archetype_earned)
    WHERE id = p_player_id
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION fn_reset_player(p_player_id INTEGER)
RETURNS SETOF players
LANGUAGE plpgsql AS
$$
DECLARE
    v_current_archetype  TEXT;
    v_prev_archetypes    TEXT;
    v_prev_array         TEXT[];
    v_new_prev           TEXT;
BEGIN
    SELECT archetype_earned, previous_archetypes
    INTO v_current_archetype, v_prev_archetypes
    FROM players WHERE id = p_player_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Игрок с id=% не найден', p_player_id;
    END IF;

    v_prev_array := ARRAY(
        SELECT value::TEXT
        FROM json_array_elements_text(v_prev_archetypes::JSON)
    );

    IF v_current_archetype IS NOT NULL
       AND NOT (v_current_archetype = ANY(v_prev_array)) THEN
        v_prev_array := array_append(v_prev_array, v_current_archetype);
    END IF;

    SELECT json_agg(e)::TEXT
    INTO v_new_prev
    FROM unnest(v_prev_array) AS e;

    v_new_prev := COALESCE(v_new_prev, '[]');

    RETURN QUERY
    UPDATE players SET
        compassion           = 0,
        courage              = 0,
        wisdom               = 0,
        ambition             = 0,
        principle            = 0,
        completed_quests     = '[]',
        archetype_earned     = NULL,
        previous_archetypes  = v_new_prev
    WHERE id = p_player_id
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION fn_top_players(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    rank        BIGINT,
    player_id   INTEGER,
    name        TEXT,
    total_score INTEGER,
    archetype   TEXT
)
LANGUAGE sql AS
$$
    SELECT
        ROW_NUMBER() OVER (ORDER BY (compassion + courage + wisdom + ambition + principle) DESC) AS rank,
        id,
        name,
        (compassion + courage + wisdom + ambition + principle) AS total_score,
        archetype_earned
    FROM players
    ORDER BY total_score DESC
    LIMIT p_limit;
$$;

DROP TRIGGER IF EXISTS trg_players_updated_at ON players;
CREATE TRIGGER trg_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE VIEW v_player_summary AS
SELECT
    id                                                          AS player_id,
    name,
    avatar,
    compassion,
    courage,
    wisdom,
    ambition,
    principle,
    (compassion + courage + wisdom + ambition + principle)      AS total_score,
    fn_calculate_archetype(compassion, courage, wisdom, ambition, principle) AS calculated_archetype,
    archetype_earned,
    previous_archetypes,
    completed_quests,
    created_at,
    updated_at
FROM players;

CREATE TABLE IF NOT EXISTS player_run_history (
    id              SERIAL    PRIMARY KEY,
    player_id       INTEGER   NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    run_number      INTEGER   NOT NULL DEFAULT 1,
    compassion      INTEGER   NOT NULL,
    courage         INTEGER   NOT NULL,
    wisdom          INTEGER   NOT NULL,
    ambition        INTEGER   NOT NULL,
    principle       INTEGER   NOT NULL,
    completed_quests TEXT     NOT NULL,
    archetype_earned TEXT,
    finished_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_history_player_id
    ON player_run_history (player_id);

CREATE OR REPLACE FUNCTION fn_archive_before_reset()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
DECLARE
    v_run_number INTEGER;
BEGIN
    IF NEW.completed_quests = '[]' AND OLD.completed_quests <> '[]' THEN
        SELECT COALESCE(MAX(run_number), 0) + 1
        INTO v_run_number
        FROM player_run_history
        WHERE player_id = OLD.id;

        INSERT INTO player_run_history
            (player_id, run_number, compassion, courage, wisdom,
             ambition, principle, completed_quests, archetype_earned)
        VALUES
            (OLD.id, v_run_number, OLD.compassion, OLD.courage, OLD.wisdom,
             OLD.ambition, OLD.principle, OLD.completed_quests, OLD.archetype_earned);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_before_reset ON players;
CREATE TRIGGER trg_archive_before_reset
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION fn_archive_before_reset();

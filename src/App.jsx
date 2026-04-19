import { useEffect, useMemo, useRef, useState } from "react";
import { useGameAudio } from "./audio.js";

const PLAYER_COLORS = [
  { background: "#5c30ff", foreground: "#ffffff" },
  { background: "#e63c23", foreground: "#ffffff" },
  { background: "#f791c3", foreground: "#111111" },
  { background: "#f6bc3f", foreground: "#111111" },
  { background: "#008c47", foreground: "#ffffff" }
];

const DEFAULT_YEARS = 80;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

function sanitizeName(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 24);
}

function normalizeYears(value, fallback = DEFAULT_YEARS) {
  const parsed = Number.parseInt(String(value), 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(0, parsed);
}

function getPlayerColor(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

function createGamePlayers(setupPlayers) {
  return setupPlayers.map((player, index) => ({
    id: player.id,
    name: player.name,
    order: index,
    startingYears: player.startingYears,
    years: player.startingYears,
    months: 0,
    eliminated: player.startingYears === 0
  }));
}

function getAlivePlayers(players) {
  return players.filter((player) => !player.eliminated);
}

function findNextLivingIndex(players, currentIndex) {
  for (let step = 1; step <= players.length; step += 1) {
    const nextIndex = (currentIndex + step) % players.length;

    if (!players[nextIndex].eliminated) {
      return {
        index: nextIndex,
        wrapped: nextIndex <= currentIndex
      };
    }
  }

  return null;
}

function buildTurnLabel(round, currentPlayer) {
  if (!currentPlayer) {
    return "Round 1";
  }

  return "Round " + round + " \u00B7 " + currentPlayer.name + "'s turn";
}

function formatCounterValue(value, minimumDigits) {
  return String(value).padStart(minimumDigits, "0");
}

function App() {
  const audio = useGameAudio();
  const addNameInputRef = useRef(null);

  const [screen, setScreen] = useState("setup");
  const [setupPlayers, setSetupPlayers] = useState([]);
  const [nextPlayerId, setNextPlayerId] = useState(1);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftYears, setDraftYears] = useState(String(DEFAULT_YEARS));
  const [gameState, setGameState] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const currentPlayer = useMemo(() => {
    if (!gameState) {
      return null;
    }

    return gameState.players.find((player) => player.id === gameState.currentPlayerId) ?? null;
  }, [gameState]);

  const winner = useMemo(() => {
    if (!gameState || gameState.winnerId == null) {
      return null;
    }

    return gameState.players.find((player) => player.id === gameState.winnerId) ?? null;
  }, [gameState]);

  const aliveCount = useMemo(
    () => (gameState ? getAlivePlayers(gameState.players).length : 0),
    [gameState]
  );

  useEffect(() => {
    if (isAddingPlayer && addNameInputRef.current) {
      addNameInputRef.current.focus();
      addNameInputRef.current.select();
    }
  }, [isAddingPlayer]);

  useEffect(() => {
    document.body.classList.toggle("modal-open", Boolean(showResetConfirm || winner));

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [showResetConfirm, winner]);

  useEffect(() => {
    if (winner && soundEnabled) {
      audio.win();
    }
  }, [winner, soundEnabled]);

  function playSound(name) {
    if (!soundEnabled) {
      return;
    }

    audio[name]?.();
  }

  function openAddPlayerForm() {
    if (setupPlayers.length >= MAX_PLAYERS) {
      return;
    }

    playSound("click");
    setDraftName("");
    setDraftYears(String(DEFAULT_YEARS));
    setIsAddingPlayer(true);
  }

  function closeAddPlayerForm() {
    playSound("click");
    setIsAddingPlayer(false);
    setDraftName("");
    setDraftYears(String(DEFAULT_YEARS));
  }

  function submitNewPlayer(event) {
    event.preventDefault();

    if (setupPlayers.length >= MAX_PLAYERS) {
      return;
    }

    const name = sanitizeName(draftName);

    if (!name) {
      addNameInputRef.current?.focus();
      return;
    }

    const startingYears = normalizeYears(draftYears, DEFAULT_YEARS);

    playSound("add");
    setSetupPlayers((players) => [
      ...players,
      {
        id: nextPlayerId,
        name,
        startingYears
      }
    ]);
    setNextPlayerId((value) => value + 1);
    setDraftName("");
    setDraftYears(String(DEFAULT_YEARS));
    setIsAddingPlayer(false);
  }

  function updateSetupPlayerName(playerId, value) {
    setSetupPlayers((players) =>
      players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              name: sanitizeName(value) || player.name
            }
          : player
      )
    );
  }

  function updateSetupPlayerYears(playerId, value) {
    setSetupPlayers((players) =>
      players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              startingYears: normalizeYears(value, player.startingYears)
            }
          : player
      )
    );
  }

  function applySetupPreset(playerId, years) {
    playSound("click");
    setSetupPlayers((players) =>
      players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              startingYears: years
            }
          : player
      )
    );
  }

  function removeSetupPlayer(playerId) {
    playSound("reset");
    setSetupPlayers((players) => players.filter((player) => player.id !== playerId));
  }

  function applyDraftPreset(years) {
    playSound("click");
    setDraftYears(String(years));
  }

  function startGame() {
    if (setupPlayers.length < MIN_PLAYERS) {
      return;
    }

    const players = createGamePlayers(setupPlayers);
    const alivePlayers = getAlivePlayers(players);
    const winnerId = alivePlayers.length === 1 ? alivePlayers[0].id : null;

    playSound("advance");
    setGameState({
      players,
      currentPlayerId: alivePlayers[0]?.id ?? null,
      round: 1,
      winnerId
    });
    setScreen("game");
  }

  function adjustLife(playerId, unit, delta) {
    if (!gameState || winner) {
      return;
    }

    const activePlayer = currentPlayer;

    if (!activePlayer || activePlayer.id !== playerId || activePlayer.eliminated) {
      return;
    }

    setGameState((state) => {
      if (!state) {
        return state;
      }

      const players = state.players.map((player) => {
        if (player.id !== playerId) {
          return player;
        }

        let nextYears = player.years;
        let nextMonths = player.months;

        if (unit === "years") {
          nextYears = Math.max(0, nextYears + delta);
        }

        if (unit === "months") {
          nextMonths += delta;

          if (nextMonths < 0) {
            if (nextYears > 0) {
              nextYears -= 1;
              nextMonths = 11;
            } else {
              nextMonths = 0;
            }
          }

          if (nextMonths > 11) {
            nextYears += 1;
            nextMonths = 0;
          }
        }

        return {
          ...player,
          years: nextYears,
          months: nextMonths,
          eliminated: nextYears === 0 && nextMonths === 0
        };
      });

      const alivePlayers = getAlivePlayers(players);
      const winnerId = alivePlayers.length === 1 ? alivePlayers[0].id : null;

      return {
        ...state,
        players,
        winnerId
      };
    });

    if (delta > 0) {
      playSound("add");
    } else {
      playSound("subtract");
    }
  }

  function advanceTurn() {
    if (!gameState || winner) {
      return;
    }

    const currentIndex = gameState.players.findIndex(
      (player) => player.id === gameState.currentPlayerId
    );

    if (currentIndex === -1) {
      return;
    }

    const nextInfo = findNextLivingIndex(gameState.players, currentIndex);

    if (!nextInfo) {
      return;
    }

    playSound("advance");
    setGameState((state) =>
      state
        ? {
            ...state,
            currentPlayerId: state.players[nextInfo.index].id,
            round: nextInfo.wrapped ? state.round + 1 : state.round
          }
        : state
    );
  }

  function openResetDialog() {
    playSound("click");
    setShowResetConfirm(true);
  }

  function closeResetDialog() {
    playSound("click");
    setShowResetConfirm(false);
  }

  function resetEverything(withSound = true) {
    if (withSound) {
      playSound("reset");
    }

    setScreen("setup");
    setSetupPlayers([]);
    setNextPlayerId(1);
    setIsAddingPlayer(false);
    setDraftName("");
    setDraftYears(String(DEFAULT_YEARS));
    setGameState(null);
    setShowResetConfirm(false);
  }

  function toggleSound() {
    if (!soundEnabled) {
      setSoundEnabled(true);
      return;
    }

    playSound("click");
    setSoundEnabled(false);
  }

  const turnCounter = buildTurnLabel(gameState?.round ?? 1, currentPlayer);
  const turnColor = currentPlayer ? getPlayerColor(currentPlayer.order) : PLAYER_COLORS[0];

  return (
    <div className="app-shell">
      <div className="poster-shape poster-shape--indigo" aria-hidden="true" />
      <div className="poster-shape poster-shape--pink" aria-hidden="true" />
      <div className="poster-shape poster-shape--xanthous" aria-hidden="true" />

      {screen === "setup" && (
        <main className="screen setup-screen">
          <div className="setup-frame">
            <header className="setup-hero">
              <h1 className="wordmark">LifeSpan</h1>
            </header>

            <section className="setup-note">
              <span className="eyebrow">Starting Class</span>
              <p>Rich = 100 years. Middle = 80 years. Poor = 50 years.</p>
            </section>

            <section className="setup-panel">
              <div className="panel-head">
                <div>
                  <span className="eyebrow">Player Setup</span>
                  <h2>Add 2 to 6 players in the order they take turns.</h2>
                </div>
                <span className="eyebrow">
                  {setupPlayers.length} / {MAX_PLAYERS} Players
                </span>
              </div>

              {setupPlayers.length === 0 && (
                <div className="empty-state">
                  <span className="eyebrow">No Players Yet</span>
                  <p>Add the first player to build the table order.</p>
                </div>
              )}

              <div className="setup-player-list">
                {setupPlayers.map((player, index) => {
                  const color = getPlayerColor(index);

                  return (
                    <article
                      key={player.id}
                      className="setup-player-row"
                      style={{
                        "--swatch-bg": color.background,
                        "--swatch-fg": color.foreground,
                        "--row-delay": index
                      }}
                    >
                      <div className="setup-player-swatch">{index + 1}</div>
                      <div className="setup-player-body">
                        <div className="setup-player-top">
                          <label className="setup-name-field">
                            <span className="eyebrow">Name</span>
                            <input
                              className="setup-name-input"
                              type="text"
                              value={player.name}
                              maxLength={24}
                              autoComplete="off"
                              spellCheck="false"
                              onChange={(event) => updateSetupPlayerName(player.id, event.target.value)}
                              onBlur={(event) => updateSetupPlayerName(player.id, event.target.value)}
                              aria-label={`Name for player ${index + 1}`}
                            />
                          </label>
                          <div className="setup-row-meta">
                            <span className="eyebrow">Turn {index + 1}</span>
                            <button
                              className="row-remove-button"
                              type="button"
                              onClick={() => removeSetupPlayer(player.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <label className="setup-years-row">
                          <span className="eyebrow">Starting Years</span>
                          <input
                            className="setup-years-input"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={player.startingYears}
                            onChange={(event) => updateSetupPlayerYears(player.id, event.target.value)}
                            onBlur={(event) => updateSetupPlayerYears(player.id, event.target.value)}
                            aria-label={`Starting years for ${player.name}`}
                          />
                        </label>

                        <div className="preset-row">
                          <button
                            className="preset-chip"
                            type="button"
                            onClick={() => applySetupPreset(player.id, 100)}
                          >
                            Rich 100
                          </button>
                          <button
                            className="preset-chip"
                            type="button"
                            onClick={() => applySetupPreset(player.id, 80)}
                          >
                            Middle 80
                          </button>
                          <button
                            className="preset-chip"
                            type="button"
                            onClick={() => applySetupPreset(player.id, 50)}
                          >
                            Poor 50
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="setup-actions">
                {!isAddingPlayer && setupPlayers.length < MAX_PLAYERS && (
                  <button className="pill-button sea-button" type="button" onClick={openAddPlayerForm}>
                    + Add Player
                  </button>
                )}

                {isAddingPlayer && (
                  <form className="inline-player-form" onSubmit={submitNewPlayer}>
                    <div className="preset-row preset-row--inline">
                      <button className="preset-chip" type="button" onClick={() => applyDraftPreset(100)}>
                        Rich 100
                      </button>
                      <button className="preset-chip" type="button" onClick={() => applyDraftPreset(80)}>
                        Middle 80
                      </button>
                      <button className="preset-chip" type="button" onClick={() => applyDraftPreset(50)}>
                        Poor 50
                      </button>
                    </div>
                    <div className="inline-form-inputs">
                      <input
                        ref={addNameInputRef}
                        className="name-input"
                        type="text"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        placeholder="Player name"
                        maxLength={24}
                        autoComplete="off"
                        spellCheck="false"
                        aria-label="Player name"
                      />
                      <input
                        className="years-input"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={draftYears}
                        onChange={(event) => setDraftYears(event.target.value)}
                        aria-label="Starting years"
                      />
                    </div>
                    <div className="inline-form-actions">
                      <button className="icon-button icon-button--confirm" type="submit" aria-label="Confirm player">
                        &#10003;
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={closeAddPlayerForm}
                        aria-label="Cancel adding player"
                      >
                        x
                      </button>
                    </div>
                  </form>
                )}

                {setupPlayers.length >= MIN_PLAYERS && (
                  <div className="setup-footer">
                    <button className="primary-button indigo-button" type="button" onClick={startGame}>
                      Start Game
                    </button>
                    <p>The order players are added becomes the permanent turn order.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      )}

      {screen === "game" && gameState && (
        <main className="screen game-screen">
          <header className="game-topbar">
            <div className="game-title">LifeSpan</div>
            <div className="topbar-actions">
              <button
                className="outline-button indigo-outline"
                type="button"
                aria-pressed={soundEnabled}
                onClick={toggleSound}
              >
                {soundEnabled ? "Sound On" : "Sound Off"}
              </button>
              <button className="outline-button red-outline" type="button" onClick={openResetDialog}>
                Reset Game
              </button>
            </div>
          </header>

          <section
            className="turn-banner"
            style={{
              "--turn-bg": turnColor.background,
              "--turn-fg": turnColor.foreground
            }}
            aria-live="polite"
          >
            <div className="turn-banner-track" aria-hidden="true" />
            <div className="turn-banner-content">
              <span className="eyebrow">Turn</span>
              <h2 className="turn-player-name">{currentPlayer?.name ?? "-"}</h2>
            </div>
          </section>

          <section className="game-summary" aria-label="Game summary">
            <div className="summary-pill">
              <span className="eyebrow">Round</span>
              <strong>{gameState.round}</strong>
            </div>
            <div className="summary-pill">
              <span className="eyebrow">Alive</span>
              <strong>{aliveCount}</strong>
            </div>
            <div className="summary-pill">
              <span className="eyebrow">Turn Order</span>
              <strong>
                {currentPlayer ? currentPlayer.order + 1 : 1} / {gameState.players.length}
              </strong>
            </div>
          </section>

          <section className="cards-wrap">
            <div className="cards-grid" data-count={gameState.players.length}>
              {gameState.players.map((player) => {
                const color = getPlayerColor(player.order);
                const isActive = currentPlayer?.id === player.id;
                const isInteractive = isActive && !player.eliminated && !winner;
                const monthLabel = player.months === 1 ? "1 month" : player.months + " months";

                return (
                  <article
                    key={player.id}
                    className={[
                      "player-card",
                      isActive ? "player-card--active" : "player-card--inactive",
                      player.eliminated ? "player-card--eliminated" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      "--card-bg": player.eliminated ? "#111111" : color.background,
                      "--card-fg": player.eliminated ? "#ffffff" : color.foreground,
                      "--card-button": player.eliminated ? "#111111" : color.background,
                      "--card-order": player.order
                    }}
                  >
                    <div className="player-card-head">
                      <div className="player-card-topline">
                        <span className="player-name">{player.name}</span>
                        <span
                          className={[
                            "player-status",
                            player.eliminated
                              ? "player-status--out"
                              : isActive
                                ? "player-status--active"
                                : ""
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {player.eliminated ? "Out" : isActive ? "Active" : "P" + (player.order + 1)}
                        </span>
                      </div>
                      <span className="player-life-line">
                        {player.years} years {"\u00B7"} {monthLabel}
                      </span>
                    </div>

                    <div className="player-counter-board">
                      <CounterModule
                        label="Years"
                        value={formatCounterValue(player.years, player.years > 99 ? 3 : 2)}
                        moduleClassName="counter-module--years"
                        canInteract={isInteractive}
                        onDecrease={() => adjustLife(player.id, "years", -1)}
                        onIncrease={() => adjustLife(player.id, "years", 1)}
                      />
                      <CounterModule
                        label="Months"
                        value={formatCounterValue(player.months, 2)}
                        moduleClassName="counter-module--months"
                        canInteract={isInteractive}
                        onDecrease={() => adjustLife(player.id, "months", -1)}
                        onIncrease={() => adjustLife(player.id, "months", 1)}
                      />
                    </div>

                    {player.eliminated && <div className="eliminated-stamp">Eliminated</div>}
                  </article>
                );
              })}
            </div>
          </section>

          <footer className="turn-footer">
            <button
              className="primary-button sea-button footer-button"
              type="button"
              onClick={advanceTurn}
              disabled={Boolean(winner)}
            >
              End Turn &rarr; Next Player
            </button>
            <p>{turnCounter}</p>
          </footer>
        </main>
      )}

      {winner && (
        <div className="overlay overlay--winner" role="dialog" aria-modal="true" aria-labelledby="winner-title">
          <div className="winner-panel">
            <span className="eyebrow">Victory</span>
            <h2 id="winner-title">{winner.name} WINS</h2>
            <p>Last life standing.</p>
            <button className="primary-button indigo-button" type="button" onClick={() => resetEverything()}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="overlay overlay--modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <div className="modal-panel">
            <span className="eyebrow">Confirm Reset</span>
            <h2 id="reset-title">Return to player setup?</h2>
            <p>This clears the current game and unlocks the turn order.</p>
            <div className="modal-actions">
              <button className="outline-button indigo-outline" type="button" onClick={closeResetDialog}>
                Keep Playing
              </button>
              <button className="primary-button red-button" type="button" onClick={() => resetEverything()}>
                Reset Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CounterModule({ label, value, moduleClassName, canInteract, onDecrease, onIncrease }) {
  return (
    <section className={["counter-module", moduleClassName].filter(Boolean).join(" ")}>
      <div className="counter-module-head">
        <span className="eyebrow">{label}</span>
      </div>

      <CounterDisplay value={value} />

      <div className="counter-module-controls">
        <button
          className="control-button"
          type="button"
          disabled={!canInteract}
          onClick={onDecrease}
          aria-label={`Decrease ${label}`}
        >
          -
        </button>
        <div className="control-divider" aria-hidden="true" />
        <button
          className="control-button"
          type="button"
          disabled={!canInteract}
          onClick={onIncrease}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </section>
  );
}

function CounterDisplay({ value }) {
  return (
    <div className="counter-display-shell" data-digits={value.length}>
      <div className="counter-display-window">
        {value.split("").map((digit, index) => (
          <div className="counter-digit" key={index}>
            <span>{digit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

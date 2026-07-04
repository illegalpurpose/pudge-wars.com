"use client";

import styles from "./Hud.module.css";

function AbilityBox({ label, icon, ready, color, activeRatio, cooldownRatio }) {
  return (
    <div
      className={`${styles.ability} ${ready ? styles.abilityReady : ""} ${
        activeRatio ? styles.abilityActive : ""
      }`}
      style={{ color, borderColor: ready || activeRatio ? color : undefined }}
    >
      <img
        src={icon}
        alt=""
        className={styles.abilityIcon}
        style={{ opacity: ready || activeRatio ? 1 : 0.35 }}
      />

      {cooldownRatio > 0 && (
        <div
          className={styles.abilityCooldown}
          style={{ transform: `scaleY(${cooldownRatio})` }}
        />
      )}
      <span
        className={`${styles.abilityKey} ${
          ready || activeRatio ? styles.abilityKeyReady : ""
        }`}
      >
        {label}
      </span>
      {activeRatio > 0 && (
        <div
          className={styles.abilityBar}
          style={{ width: `${activeRatio * 100}%` }}
        />
      )}
    </div>
  );
}

export function Hud({ hud }) {
  if (!hud) return null;

  return (
    <div className={styles.hud}>
      <div className={styles.scoreRow}>
        <span className={styles.score}>Score: {hud.score}</span>
        <span className={styles.record}>Record: {hud.record}</span>
      </div>

      <div className={styles.abilities}>
        <AbilityBox
          label="Q"
          icon="/icon_hook.png"
          ready={hud.hookReady}
          color="#00FFCC"
        />
        <AbilityBox
          label="W"
          icon="/icon_blink.png"
          ready={hud.blinkReady}
          color="#9B59FF"
        />
        <AbilityBox
          label="E"
          icon="/icon_invis.png"
          ready={hud.invisReady}
          color="#4A9EFF"
          activeRatio={hud.invisibleActiveRatio}
          cooldownRatio={hud.invisibleCooldownRatio}
        />
      </div>

      {hud.gameOver && (
        <div className={styles.overlay}>
          <div
            className={`${styles.overlayTitle} ${
              hud.defeat ? styles.defeatTitle : styles.victoryTitle
            }`}
          >
            {hud.defeat ? "GAME OVER" : "VICTORY!"}
          </div>
          {hud.defeat && (
            <div className={styles.overlayScore}>
              Hooks landed: {hud.score}
            </div>
          )}
          <div className={styles.overlayHint}>Press R to Restart</div>
        </div>
      )}
    </div>
  );
}

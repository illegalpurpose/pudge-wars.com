"use client";

import dynamic from "next/dynamic";
import styles from "./Landing.module.css";

const GameCanvas = dynamic(
  () => import("./GameCanvas").then((m) => m.GameCanvas),
  { ssr: false },
);

const ABILITIES = [
  {
    icon: "/icon_hook.png",
    key: "Q",
    title: "Hook",
    text: "Chain your enemy and yank them straight to you — the Pudge Wars classic.",
  },
  {
    icon: "/icon_blink.png",
    key: "W",
    title: "Blink",
    text: "Instantly dash toward your cursor to escape a chase or close the gap.",
  },
  {
    icon: "/icon_invis.png",
    key: "E",
    title: "Invisibility",
    text: "Vanish for a few seconds and land a surprise hook out of nowhere.",
  },
];

function scrollToPlay() {
  document
    .getElementById("play")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Landing() {
  return (
    <div className={styles.root}>
      <header className={styles.nav}>
        <div className={styles.navBrand}>
          <img src="/pudge_sprite.png" alt="" className={styles.navSprite} />
          <span>
            PUDGE <span className={styles.accent}>WARS</span>
          </span>
        </div>
        <button className={styles.navPlay} onClick={scrollToPlay}>
          Play
        </button>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <img
          src="/hook_sprite.png"
          alt=""
          className={styles.heroHook}
        />
        <img
          src="/pudge_sprite.png"
          alt=""
          className={styles.heroPudge}
        />

        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            PUDGE <span className={styles.accent}>WARS</span>
          </h1>
          <p className={styles.subtitle}>
            Hook, blink, vanish, and hunt down bots in Dota&nbsp;2-inspired
            arenas. A free browser game — no installs, just jump in and play.
          </p>
          <button className={styles.cta} onClick={scrollToPlay}>
            Start Playing
          </button>
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Abilities</h2>
        <div className={styles.cards}>
          {ABILITIES.map((a) => (
            <div className={styles.card} key={a.key}>
              <div className={styles.cardIconWrap}>
                <img src={a.icon} alt="" className={styles.cardIcon} />
                <span className={styles.cardKey}>{a.key}</span>
              </div>
              <h3 className={styles.cardTitle}>{a.title}</h3>
              <p className={styles.cardText}>{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.playSection}>
        <div id="play" />
        <GameCanvas />
      </section>

      <footer className={styles.footer}>
        <span>Pudge Wars — a Dota 2 fan game.</span>
        <span className={styles.footerDim}>Made with love for hooks.</span>
      </footer>
    </div>
  );
}

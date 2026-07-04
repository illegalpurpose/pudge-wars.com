"use client";

import { useEffect, useId } from "react";
import styles from "./BannerAd.module.css";

const PLACEHOLDER_BLOCK_ID = "R-A-PLACEHOLDER-ID";

export function BannerAd({ blockId = PLACEHOLDER_BLOCK_ID, className = "" }) {
  const renderTo = `yandex_rtb_${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    if (!blockId || blockId === PLACEHOLDER_BLOCK_ID) return;

    window.yaContextCb = window.yaContextCb || [];

    let script = document.querySelector(
      'script[data-yandex-context="true"]'
    );
    if (!script) {
      script = document.createElement("script");
      script.src = "https://yandex.ru/ads/system/context.js";
      script.async = true;
      script.dataset.yandexContext = "true";
      document.head.appendChild(script);
    }

    window.yaContextCb.push(() => {
      window.Ya?.Context?.AdvManager?.render({
        blockId,
        renderTo,
      });
    });
  }, [blockId, renderTo]);

  return (
    <div className={`${styles.banner} ${className}`}>
      <div id={renderTo} className={styles.slot} />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeDollarSign, Code2, ExternalLink, QrCode, X } from "lucide-react";
import { useI18n } from "./i18n";

type Dialog = "reward" | "follow" | null;

export function SupportPanel() {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!dialog) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setDialog(null); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [dialog]);

  const open = (next: Exclude<Dialog, null>, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setDialog(next);
  };
  const close = () => {
    setDialog(null);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  return <div className="support-panel">
    <h2>{t("support.title")}</h2>
    <p>{t("support.text")}</p>
    <div className="support-actions">
      <button onClick={(event) => open("reward", event.currentTarget)}><BadgeDollarSign size={18}/><span>{t("support.reward")}</span></button>
      <button onClick={(event) => open("follow", event.currentTarget)}><QrCode size={18}/><span>{t("support.follow")}</span></button>
    </div>
    <div className="support-links">
      <a href="https://github.com/joeseesun/qiaomu-radio" target="_blank" rel="noreferrer"><Code2 size={16}/>{t("support.source")}<ExternalLink size={13}/></a>
      <a href="https://x.com/vista8" target="_blank" rel="noreferrer">X · @vista8<ExternalLink size={13}/></a>
      <a href="https://tuijian.qiaomu.ai/" target="_blank" rel="noreferrer">{t("support.recommend")}<ExternalLink size={13}/></a>
    </div>
    {dialog && createPortal(<div className="support-modal" role="presentation" onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); close(); } }} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="support-dialog-title">
        <button ref={closeRef} className="support-close" aria-label={t("support.close")} onClick={close}><X size={20}/></button>
        <h2 id="support-dialog-title">{dialog === "reward" ? t("support.reward") : t("support.followTitle")}</h2>
        <img src={dialog === "reward" ? "/assets/qiaomu_reward_qr.png" : "/assets/qiaomu_wechat_public_account_qr.jpg"} alt={dialog === "reward" ? "向阳乔木打赏二维码" : "向阳乔木推荐看公众号二维码"}/>
        <p>{dialog === "reward" ? t("support.thanks") : t("support.wechat")}</p>
        {dialog === "follow" && <div className="support-modal-links"><a href="https://github.com/joeseesun/" target="_blank" rel="noreferrer"><Code2 size={17}/>GitHub</a><a href="https://x.com/vista8" target="_blank" rel="noreferrer">X · @vista8</a></div>}
      </section>
    </div>, document.body)}
  </div>;
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeDollarSign, Code2, ExternalLink, QrCode, X } from "lucide-react";

type Dialog = "reward" | "follow" | null;

export function SupportPanel() {
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
    <h2>支持乔木电台</h2>
    <p>喜欢这台收音机，可以请乔木喝杯咖啡，或关注后续更新。</p>
    <div className="support-actions">
      <button onClick={(event) => open("reward", event.currentTarget)}><BadgeDollarSign size={18}/><span>打赏支持</span></button>
      <button onClick={(event) => open("follow", event.currentTarget)}><QrCode size={18}/><span>关注乔木</span></button>
    </div>
    <div className="support-links">
      <a href="https://github.com/joeseesun/qiaomu-radio" target="_blank" rel="noreferrer"><Code2 size={16}/>项目源码<ExternalLink size={13}/></a>
      <a href="https://x.com/vista8" target="_blank" rel="noreferrer">X · @vista8<ExternalLink size={13}/></a>
      <a href="https://tuijian.qiaomu.ai/" target="_blank" rel="noreferrer">乔木推荐<ExternalLink size={13}/></a>
    </div>
    {dialog && createPortal(<div className="support-modal" role="presentation" onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); close(); } }} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="support-dialog-title">
        <button ref={closeRef} className="support-close" aria-label="关闭" onClick={close}><X size={20}/></button>
        <h2 id="support-dialog-title">{dialog === "reward" ? "打赏支持" : "关注向阳乔木"}</h2>
        <img src={dialog === "reward" ? "/assets/qiaomu_reward_qr.png" : "/assets/qiaomu_wechat_public_account_qr.jpg"} alt={dialog === "reward" ? "向阳乔木打赏二维码" : "向阳乔木推荐看公众号二维码"}/>
        <p>{dialog === "reward" ? "感谢支持乔木继续做有趣、可用的产品。" : "微信公众号：向阳乔木推荐看"}</p>
        {dialog === "follow" && <div className="support-modal-links"><a href="https://github.com/joeseesun/" target="_blank" rel="noreferrer"><Code2 size={17}/>GitHub</a><a href="https://x.com/vista8" target="_blank" rel="noreferrer">X · @vista8</a></div>}
      </section>
    </div>, document.body)}
  </div>;
}

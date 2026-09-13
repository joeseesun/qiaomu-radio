import { useI18n } from "./i18n";

export function ModelLoader({ fantasy = false, progress }: { fantasy?: boolean; progress?: number }) {
  const { t } = useI18n();
  const percent = Math.round(Math.max(0, Math.min(1, progress ?? .08)) * 100);
  if (!fantasy) return <div className="model-loader model-loader-rams" role="status" aria-label={t("status.connecting")}><i /></div>;
  return <div className="model-loader model-loader-fantasy" role="progressbar" aria-label={t("status.connecting")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
    <img src="/assets/warcraft-loading-rune.png?v=2" alt="" loading="eager" fetchPriority="high" />
  </div>;
}

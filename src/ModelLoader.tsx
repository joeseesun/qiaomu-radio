export function ModelLoader({ fantasy = false, progress }: { fantasy?: boolean; progress?: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, progress ?? .08)) * 100);
  if (!fantasy) return <div className="model-loader model-loader-rams" role="status" aria-label="正在载入 3D 收音机"><i /></div>;
  return <div className="model-loader model-loader-fantasy" role="progressbar" aria-label="正在装配魔兽世界 3D 收音机" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
    <img src="/assets/warcraft-loading-rune.png?v=2" alt="" loading="eager" fetchPriority="high" />
  </div>;
}

export const FANTASY_MODEL_URL = "/models/qiaomu-fantasy-radio-hyper3d-v2.glb";

export function FantasyModelPreload() {
  return <link rel="preload" href={FANTASY_MODEL_URL} as="fetch" crossOrigin="anonymous" />;
}

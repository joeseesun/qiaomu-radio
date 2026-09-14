export interface DirectoryFilter {
  tag?: string;
  country?: string;
  language?: string;
}

export const BROWSE_GROUPS = [
  { label: "音乐", items: [["jazz", "爵士"], ["classical", "古典"], ["electronic", "电子"], ["rock", "摇滚"], ["pop", "流行"], ["folk", "民谣"], ["world", "世界音乐"]] },
  { label: "内容", items: [["news", "新闻"], ["talk", "谈话"], ["sports", "体育"], ["culture", "文化"]] },
  { label: "声音", items: [["nature", "自然声音"], ["ambient", "环境氛围"], ["meditation", "冥想"]] },
] as const;

export const LANGUAGES = [["", "全部语言"], ["chinese", "中文"], ["english", "英语"], ["japanese", "日语"], ["french", "法语"], ["german", "德语"], ["spanish", "西班牙语"]] as const;
export const REGIONS = [["", "全部地区"], ["CN", "中国"], ["US", "美国"], ["GB", "英国"], ["JP", "日本"], ["CA", "加拿大"], ["DE", "德国"], ["FR", "法国"], ["AU", "澳大利亚"]] as const;

const GENRES: Record<string, string> = {};
for (const group of BROWSE_GROUPS) for (const [tag, label] of group.items) GENRES[tag] = label;
Object.assign(GENRES, { chillout: "驰放", lounge: "休闲音乐", instrumental: "器乐", "easy listening": "轻音乐", soul: "灵魂乐", dance: "舞曲", "ambient and relaxation music": "放松音乐", "classical music": "古典", relax: "放松", international: "国际音乐" });

export function genreLabel(tag: string): string { return GENRES[tag.toLowerCase()] ?? tag; }

export function countryLabel(code: string, fallback: string): string {
  const short: Record<string, string> = { US: "美国", GB: "英国", CN: "中国", CA: "加拿大", DE: "德国", JP: "日本", FR: "法国", AU: "澳大利亚", TW: "中国台湾", HK: "中国香港" };
  const region = code.toUpperCase();
  if (short[region]) return short[region];
  try {
    // Older hosts retain the directory label when DisplayNames is unavailable.
    const IntlRegion = (Intl as unknown as { DisplayNames?: new (locales: string[], options: { type: string }) => { of(code: string): string | undefined } }).DisplayNames;
    if (IntlRegion && /^[A-Z]{2}$/.test(region)) return new IntlRegion(["zh-CN"], { type: "region" }).of(region) ?? fallback;
  } catch { /* Invalid provider region: retain the source label. */ }
  return fallback || "全球";
}

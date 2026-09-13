import type { MoodId, StationSource, ThemeId } from "./types";

export type RadioTheme = {
  id: ThemeId;
  label: string;
  family: string;
  note: string;
  mood: MoodId;
  source: StationSource;
  accent: string;
};

export const RADIO_THEMES: RadioTheme[] = [
  {
    id: "fantasy",
    label: "奥术战歌 · 3D",
    family: "奇幻实体播放器",
    note: "魔法屏幕与可操作按键",
    mood: "energy",
    source: "radio-browser",
    accent: "#e3a33d",
  },
  {
    id: "rams",
    label: "Rams · 3D",
    family: "立体收音机",
    note: "实体旋钮与实时屏幕",
    mood: "focus",
    source: "radio-browser",
    accent: "#c36a35",
  },
  {
    id: "editorial",
    label: "极简",
    family: "乔木原版",
    note: "大封面与留白",
    mood: "focus",
    source: "radio-browser",
    accent: "#2f6f69",
  },
  {
    id: "pocket",
    label: "iPod",
    family: "便携播放器",
    note: "单色屏与触控圆盘",
    mood: "jazz",
    source: "radio-browser",
    accent: "#758167",
  },
  {
    id: "deck",
    label: "Winamp",
    family: "复古桌面播放器",
    note: "频谱、像素字与紧凑控制",
    mood: "energy",
    source: "radio-browser",
    accent: "#c8ef55",
  },
  {
    id: "console",
    label: "foobar2000",
    family: "资料库播放器",
    note: "密集信息与专业监听",
    mood: "classical",
    source: "radio-browser",
    accent: "#75a7bd",
  },
  {
    id: "china",
    label: "收音机",
    family: "公开直播源",
    note: "央广与广播机构官方源",
    mood: "world",
    source: "china-curated",
    accent: "#a62f2b",
  },
];

export function getTheme(themeId: ThemeId) {
  return RADIO_THEMES.find((theme) => theme.id === themeId) || RADIO_THEMES.find((theme) => theme.id === "editorial")!;
}

export function themeQuery(themeId: ThemeId) {
  const theme = getTheme(themeId);
  return { mood: theme.mood, source: theme.source };
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const LOCALES = ["zh-CN", "en", "es", "fr", "de", "ja"] as const;
export type Locale = typeof LOCALES[number];
export const LOCALE_LABELS: Record<Locale, string> = { "zh-CN": "简体中文", en: "English", es: "Español", fr: "Français", de: "Deutsch", ja: "日本語" };
const KEY = "qiaomu-radio-locale-v1";

const zh = {
  "theme.switch":"切换主题","theme.menu":"播放器主题","theme.fantasy":"魔兽世界 3D","theme.rams":"博朗 · 3D","theme.editorial":"极简","theme.pocket":"iPod","theme.deck":"Winamp","theme.console":"foobar2000",
  "page.now":"正在播放","page.menu":"乔木电台","page.channels":"频道","page.regions":"地区电台","page.stations":"电台列表","page.favorites":"喜欢的电台","page.history":"最近收听","page.search":"搜索电台","page.info":"关于电台","page.support":"支持与关注","page.language":"语言",
  "status.connecting":"连接中…","status.live":"正在直播","status.paused":"已暂停","now.title":"此刻，听点什么","now.prompt":"按播放，遇见下一段声音。","live.radio":"电台直播",
  "search.name":"电台名称","search.submit":"提交搜索","search.current":"搜索当前电台来源","search.china":"中国电台","search.global":"全球精选 20",
  "info.text":"全球电台来自 Radio Browser，中国电台使用精选公开直播源。喜欢与收听记录保存在本机。","info.website":"电台官网",
  "empty.stations":"还没有电台，去频道里选一种心情。","empty.favorites":"按下爱心，把喜欢的声音留在这里。","empty.history":"开始收听后，电台会留在这里。","empty.loading":"正在寻找电台…",
  "action.like":"喜欢","action.unlike":"取消喜欢","action.dislike":"不喜欢并换台","action.list":"电台列表","action.retry":"重试","action.volume":"音量","action.previous":"上一家电台","action.next":"下一家电台","action.play":"播放","action.pause":"暂停","action.stop":"停止","action.menu":"打开菜单","action.back":"返回菜单","action.restore":"恢复原始视角","action.select":"选择当前菜单项","action.about":"关于播放器","action.explore":"探索机身","action.explode":"拆解展示","action.collapse":"合上机身","action.favoriteCurrent":"收藏当前电台","action.unfavoriteCurrent":"取消收藏当前电台","language.choose":"选择界面语言",
  "label.region":"地区","label.format":"格式","label.station":"电台","region.auto":"自动判断地区","status.stopped":"已停止播放","status.broadcast":"直播",
  "mood.unwind":"松一口气","mood.focus":"安静做事","mood.jazz":"爵士时刻","mood.classical":"古典留白","mood.energy":"需要能量","mood.world":"去远方",
  "support.title":"支持乔木电台","support.text":"喜欢这台收音机，可以请乔木喝杯咖啡，或关注后续更新。","support.reward":"打赏支持","support.follow":"关注乔木","support.source":"项目源码","support.recommend":"乔木推荐","support.close":"关闭","support.followTitle":"关注向阳乔木","support.thanks":"感谢支持乔木继续做有趣、可用的产品。","support.wechat":"微信公众号：向阳乔木推荐看",
} as const;
export type MessageKey = keyof typeof zh;

const en: Partial<Record<MessageKey,string>> = {
  "theme.switch":"Switch theme","theme.menu":"Player themes","theme.fantasy":"Fantasy 3D","theme.rams":"Braun · 3D","theme.editorial":"Minimal",
  "page.now":"Now playing","page.menu":"Qiaomu Radio","page.channels":"Channels","page.stations":"Stations","page.favorites":"Favorites","page.history":"History","page.search":"Search","page.info":"About","page.support":"Support & follow","page.language":"Language",
  "status.connecting":"Connecting…","status.live":"Live","status.paused":"Paused","now.title":"What shall we hear?","now.prompt":"Press play to discover a station.","live.radio":"Live radio",
  "search.name":"Station name","search.submit":"Search","search.current":"Search the current source","search.china":"China stations","search.global":"Global Picks 20","info.text":"Global stations come from Radio Browser. China stations use reviewed public streams. Likes and history stay on this device.","info.website":"Station website",
  "empty.stations":"No stations yet. Choose a channel.","empty.favorites":"Tap the heart to save a station.","empty.history":"Stations appear here after listening.","empty.loading":"Finding stations…",
  "action.like":"Like","action.unlike":"Unlike","action.dislike":"Dislike and skip","action.list":"Stations","action.retry":"Retry","action.volume":"Volume","action.previous":"Previous station","action.next":"Next station","action.play":"Play","action.pause":"Pause","action.stop":"Stop","action.menu":"Open menu","action.back":"Back to menu","action.restore":"Restore view","action.select":"Select item","action.about":"About player","action.explore":"Explore radio","action.explode":"Exploded view","action.collapse":"Close radio","action.favoriteCurrent":"Favorite current station","action.unfavoriteCurrent":"Unfavorite current station","language.choose":"Choose interface language","label.region":"Region","label.format":"Format","label.station":"Station","status.stopped":"Playback stopped","status.broadcast":"Broadcast",
  "mood.unwind":"Unwind","mood.focus":"Focus","mood.jazz":"Jazz","mood.classical":"Classical","mood.energy":"Energy","mood.world":"World",
  "support.title":"Support Qiaomu Radio","support.text":"Enjoy the radio? Buy Qiaomu a coffee or follow future updates.","support.reward":"Donate","support.follow":"Follow Qiaomu","support.source":"Source code","support.recommend":"Qiaomu Picks","support.close":"Close","support.followTitle":"Follow Qiaomu","support.thanks":"Thank you for supporting useful, playful products.","support.wechat":"WeChat: 向阳乔木推荐看",
};

const es: Partial<Record<MessageKey,string>> = {
  "theme.switch":"Cambiar tema","theme.menu":"Temas","page.now":"Reproduciendo","page.menu":"Qiaomu Radio","page.channels":"Canales","page.stations":"Emisoras","page.favorites":"Favoritos","page.history":"Historial","page.search":"Buscar","page.info":"Acerca de","page.support":"Apoyar y seguir","page.language":"Idioma","status.connecting":"Conectando…","status.live":"En directo","status.paused":"En pausa","now.title":"¿Qué escuchamos?","now.prompt":"Pulsa reproducir para descubrir una emisora.","live.radio":"Radio en directo","search.name":"Nombre de emisora","search.submit":"Buscar","search.current":"Buscar en la fuente actual","search.china":"Emisoras de China","search.global":"Emisoras globales","empty.stations":"Elige un canal para ver emisoras.","empty.favorites":"Pulsa el corazón para guardar una emisora.","empty.history":"Las emisoras escuchadas aparecerán aquí.","empty.loading":"Buscando emisoras…","action.like":"Me gusta","action.unlike":"Quitar Me gusta","action.dislike":"No me gusta y saltar","action.list":"Emisoras","action.retry":"Reintentar","action.volume":"Volumen","action.previous":"Emisora anterior","action.next":"Emisora siguiente","action.play":"Reproducir","action.pause":"Pausar","action.menu":"Abrir menú","action.back":"Volver al menú","action.restore":"Restaurar vista","action.select":"Seleccionar","language.choose":"Elegir idioma","mood.unwind":"Relajarse","mood.focus":"Concentración","mood.jazz":"Jazz","mood.classical":"Clásica","mood.energy":"Energía","mood.world":"Mundo","support.title":"Apoya Qiaomu Radio","support.text":"Invita a Qiaomu a un café o sigue las novedades.","support.reward":"Donar","support.follow":"Seguir","support.source":"Código fuente","support.recommend":"Recomendaciones","support.close":"Cerrar","support.followTitle":"Seguir a Qiaomu","support.thanks":"Gracias por apoyar productos útiles.","support.wechat":"WeChat: 向阳乔木推荐看",
};

const fr: Partial<Record<MessageKey,string>> = {
  "theme.switch":"Changer de thème","theme.menu":"Thèmes","page.now":"À l’écoute","page.menu":"Qiaomu Radio","page.channels":"Chaînes","page.stations":"Stations","page.favorites":"Favoris","page.history":"Historique","page.search":"Rechercher","page.info":"À propos","page.support":"Soutenir et suivre","page.language":"Langue","status.connecting":"Connexion…","status.live":"En direct","status.paused":"En pause","now.title":"Qu’écouter maintenant ?","now.prompt":"Appuyez sur lecture pour découvrir une station.","live.radio":"Radio en direct","search.name":"Nom de la station","search.submit":"Rechercher","search.current":"Rechercher dans la source actuelle","search.china":"Stations chinoises","search.global":"Stations mondiales","empty.stations":"Choisissez une chaîne pour découvrir des stations.","empty.favorites":"Touchez le cœur pour enregistrer une station.","empty.history":"Les stations écoutées apparaîtront ici.","empty.loading":"Recherche de stations…","action.like":"J’aime","action.unlike":"Retirer des favoris","action.dislike":"Je n’aime pas, suivante","action.list":"Stations","action.retry":"Réessayer","action.volume":"Volume","action.previous":"Station précédente","action.next":"Station suivante","action.play":"Lecture","action.pause":"Pause","action.menu":"Ouvrir le menu","action.back":"Retour au menu","action.restore":"Rétablir la vue","action.select":"Sélectionner","language.choose":"Choisir la langue","mood.unwind":"Détente","mood.focus":"Concentration","mood.jazz":"Jazz","mood.classical":"Classique","mood.energy":"Énergie","mood.world":"Monde","support.title":"Soutenir Qiaomu Radio","support.text":"Offrez un café à Qiaomu ou suivez les nouveautés.","support.reward":"Faire un don","support.follow":"Suivre Qiaomu","support.source":"Code source","support.recommend":"Sélection Qiaomu","support.close":"Fermer","support.followTitle":"Suivre Qiaomu","support.thanks":"Merci de soutenir des produits utiles.","support.wechat":"WeChat : 向阳乔木推荐看",
};

const de: Partial<Record<MessageKey,string>> = {
  "theme.switch":"Design wechseln","theme.menu":"Player-Designs","page.now":"Wiedergabe","page.menu":"Qiaomu Radio","page.channels":"Kanäle","page.stations":"Sender","page.favorites":"Favoriten","page.history":"Verlauf","page.search":"Suchen","page.info":"Info","page.support":"Unterstützen & folgen","page.language":"Sprache","status.connecting":"Verbinden…","status.live":"Live","status.paused":"Pausiert","now.title":"Was möchten Sie hören?","now.prompt":"Drücken Sie Play, um einen Sender zu entdecken.","live.radio":"Live-Radio","search.name":"Sendername","search.submit":"Suchen","search.current":"Aktuelle Quelle durchsuchen","search.china":"Sender aus China","search.global":"Weltweite Sender","empty.stations":"Wählen Sie einen Kanal.","empty.favorites":"Mit dem Herz einen Sender speichern.","empty.history":"Gehörte Sender erscheinen hier.","empty.loading":"Sender werden gesucht…","action.like":"Gefällt mir","action.unlike":"Nicht mehr mögen","action.dislike":"Ablehnen und weiter","action.list":"Sender","action.retry":"Erneut versuchen","action.volume":"Lautstärke","action.previous":"Vorheriger Sender","action.next":"Nächster Sender","action.play":"Wiedergabe","action.pause":"Pause","action.menu":"Menü öffnen","action.back":"Zurück zum Menü","action.restore":"Ansicht zurücksetzen","action.select":"Auswählen","language.choose":"Sprache wählen","mood.unwind":"Entspannen","mood.focus":"Fokus","mood.jazz":"Jazz","mood.classical":"Klassik","mood.energy":"Energie","mood.world":"Welt","support.title":"Qiaomu Radio unterstützen","support.text":"Spendieren Sie Qiaomu einen Kaffee oder folgen Sie den Updates.","support.reward":"Spenden","support.follow":"Qiaomu folgen","support.source":"Quellcode","support.recommend":"Qiaomu-Empfehlungen","support.close":"Schließen","support.followTitle":"Qiaomu folgen","support.thanks":"Danke für Ihre Unterstützung.","support.wechat":"WeChat: 向阳乔木推荐看",
};

const ja: Partial<Record<MessageKey,string>> = {
  "theme.switch":"テーマを切り替え","theme.menu":"プレイヤーテーマ","page.now":"再生中","page.menu":"Qiaomu Radio","page.channels":"チャンネル","page.stations":"放送局","page.favorites":"お気に入り","page.history":"履歴","page.search":"検索","page.info":"このラジオについて","page.support":"支援・フォロー","page.language":"言語","status.connecting":"接続中…","status.live":"ライブ","status.paused":"一時停止","now.title":"今、何を聴きますか？","now.prompt":"再生を押して放送局を見つけましょう。","live.radio":"ライブ配信","search.name":"放送局名","search.submit":"検索","search.current":"現在のソースを検索","search.china":"中国の放送局","search.global":"世界の放送局","empty.stations":"チャンネルを選んでください。","empty.favorites":"ハートを押すと保存できます。","empty.history":"聴いた放送局がここに表示されます。","empty.loading":"放送局を検索中…","action.like":"お気に入り","action.unlike":"お気に入り解除","action.dislike":"好みではない・次へ","action.list":"放送局","action.retry":"再試行","action.volume":"音量","action.previous":"前の放送局","action.next":"次の放送局","action.play":"再生","action.pause":"一時停止","action.menu":"メニューを開く","action.back":"メニューへ戻る","action.restore":"表示を戻す","action.select":"選択","language.choose":"表示言語を選択","mood.unwind":"リラックス","mood.focus":"集中","mood.jazz":"ジャズ","mood.classical":"クラシック","mood.energy":"エネルギー","mood.world":"ワールド","support.title":"Qiaomu Radioを支援","support.text":"コーヒーを贈るか、更新をフォローしてください。","support.reward":"寄付","support.follow":"フォロー","support.source":"ソースコード","support.recommend":"Qiaomuおすすめ","support.close":"閉じる","support.followTitle":"Qiaomuをフォロー","support.thanks":"ご支援ありがとうございます。","support.wechat":"WeChat：向阳乔木推荐看",
};

const messages: Record<Locale, Partial<Record<MessageKey,string>>> = { "zh-CN": zh, en, es, fr, de, ja };
const globalPickLabels: Record<Locale, string> = {
  "zh-CN": "全球精选 20", en: "Global Picks 20", es: "20 selecciones globales",
  fr: "20 sélections mondiales", de: "20 globale Empfehlungen", ja: "世界のおすすめ 20 局",
};
const regionPageLabels: Record<Locale, string> = {
  "zh-CN": "地区电台", en: "Stations by region", es: "Emisoras por región",
  fr: "Stations par région", de: "Sender nach Region", ja: "地域別の放送局",
};
const regionAutoLabels: Record<Locale, string> = {
  "zh-CN": "自动判断地区", en: "Detect my region", es: "Detectar mi región",
  fr: "Détecter ma région", de: "Region automatisch erkennen", ja: "地域を自動判定",
};
export function detectLocale(languages: readonly string[] = navigator.languages) {
  for (const language of languages) {
    const normalized = language.toLowerCase();
    const match = LOCALES.find((locale) => normalized === locale.toLowerCase() || normalized.split("-")[0] === locale.split("-")[0].toLowerCase());
    if (match) return match;
  }
  return "en" as Locale;
}
export function message(locale: Locale, key: MessageKey) {
  if (key === "search.global") return globalPickLabels[locale];
  if (key === "page.regions") return regionPageLabels[locale];
  if (key === "region.auto") return regionAutoLabels[locale];
  return messages[locale][key] || en[key] || zh[key];
}
export function regionName(locale: Locale, code: string, fallback: string) {
  try { return code ? new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) || fallback : fallback; } catch { return fallback; }
}

const I18n = createContext({ locale: "zh-CN" as Locale, setLocale: (_locale: Locale) => {}, t: (key: MessageKey) => zh[key] as string });
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem(KEY) as Locale | null;
    return saved && LOCALES.includes(saved) ? saved : detectLocale();
  });
  useEffect(() => { localStorage.setItem(KEY, locale); document.documentElement.lang = locale; }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: (key: MessageKey) => message(locale, key) }), [locale]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}
export function useI18n() { return useContext(I18n); }

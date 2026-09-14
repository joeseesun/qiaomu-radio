# Changelog

All notable changes to Qiaomu Radio are documented here.

## 1.1.1 - 2026-09-14

- iPod volume responds while dragging without rebuilding the slider; values persist on release. LCD fill and cursor no longer inherit the host's raised white thumb.
- Directly clickable menus remain primary. Optional wheel scrolling and arrow keys select entries; center confirms; MENU returns one level. On Now Playing, center still toggles playback.
- Compact menu rows, consistent monochrome selection, fixed play/pause wheel marking and narrow-pane spacing. No fake battery or seek controls.
- Website runtime and deployment are unchanged. This update continues through the original official repository while repository migration is pending.

## 1.1.0 - 2026-09-14

### Changed

- The original player is now fully immersive: no inner title bar, frame, corner radius or shadow, and it fills the Obsidian content area edge to edge. Only the tab keeps the plugin name.
- Flat station rows preserve country, genre, codec and bitrate. Current-station ink and hover backgrounds are separate, with space between rows.
- The plugin no longer emits `aria-label`, `title`, `setTooltip` or `data-tooltip`, so Obsidian never shows an unrequested hover bubble; icons use hidden text labels and inputs use native labels.
- Plugin themes are limited to the original player and iPod; previously removed themes migrate to the original player.

### Added

- Ten interface language choices with system-language detection and English fallback; Arabic uses right-to-left layout. Untranslated secondary messages fall back to English.
- Browse music, spoken audio and soundscapes with exact-tag, language and region filters. Draft selections are applied together; reset remains in the fixed footer.
- A 15-minute directory cache with concurrent-request deduplication, stale-result protection and retained results on refresh failure.
- Responsive player recomposition and a fixed-proportion iPod shell with isolated monochrome controls.
- Regression tests for the immersive layout contract, the tooltip-free rendered view, station row content, and iPod screen navigation.

## 1.0.0 - 2026-09-13

### Added

- Native Obsidian radio view with responsive light and dark theme support.
- Radio Browser directory, search, six mood channels, and a reviewed fallback directory.
- MP3/AAC playback plus HLS support where the host and stream permit it.
- Previous, next, play, pause, volume, likes, listening history, and local station-level recommendations.
- Automatic fallback when a live stream fails.
- Vault-local preference storage without accounts or client telemetry.

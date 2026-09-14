# Changelog

All notable changes to Qiaomu Radio are documented here.

## 1.1.0 - 2026-09-14

### Changed

- The original player is now fully immersive: no inner title bar, frame, corner radius or shadow, and it fills the Obsidian content area edge to edge. Only the tab keeps the plugin name.
- The station list is one stable table instead of grey cards: position and playing state, station name, country and genre, quality, and favourite. The whole row plays, and the current station uses the accent background only.
- The plugin no longer emits `aria-label`, `title`, `setTooltip` or `data-tooltip`, so Obsidian never shows an unrequested hover bubble; icons use hidden text labels and inputs use native labels.
- Plugin themes are limited to the original player and iPod; previously removed themes migrate to the original player.

### Added

- Regression tests for the immersive layout contract, the tooltip-free rendered view, station row content, and iPod screen navigation.

## 1.0.0 - 2026-09-13

### Added

- Native Obsidian radio view with responsive light and dark theme support.
- Radio Browser directory, search, six mood channels, and a reviewed fallback directory.
- MP3/AAC playback plus HLS support where the host and stream permit it.
- Previous, next, play, pause, volume, likes, listening history, and local station-level recommendations.
- Automatic fallback when a live stream fails.
- Vault-local preference storage without accounts or client telemetry.

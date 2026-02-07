# Playlist Loop & Transition Implementation

## Overview
Implemented advanced playlist control features including per-item loop settings and transition stability improvements.

## Key Features

### 1. Loop Control
- **"Play in Loop" Toggle**: Added to the Playlist Editor.
  - Default: **Enabled** (Content repeats in every playlist cycle).
  - Disabled: **Play Once** (Content plays once per session/reset, then is skipped in subsequent loops).
- **Player Logic**: 
  - Tracks played items in `playedItems` state.
  - intelligently skips non-looping items that have already played.
  - Automatically resets play history when all available items have been exhausted, creating a new cycle.

### 2. Transition Effects
- **Selection**: Users can select transition effects (Fade, Slide, etc.) in the Playlist Editor.
- **Rendering**: `MediaPlayer` applies CSS-based entry animations based on the selection.
- **Stability**: Refactored `MediaPlayer` to use `useRef` for callbacks, preventing playback interruptions/timer resets during parent component re-renders.

### 3. Data Persistence
- Updated `Playlists.jsx` to use a generic `updateItemMutation`, allowing updates to `play_in_loop` and `duration` via the API.
- Backward compatible: specific `play_in_loop` values are optional (defaults to true).

## Technical Details

### Modified Files
- `frontend/src/pages/Playlists.jsx`: Added UI for loop toggle.
- `frontend/src/pages/DevicePlayer.jsx`: Implemented skip logic.
- `frontend/src/components/MediaPlayer.jsx`: Implemented transition stability refs.

## Usage
1. Open Playlist Editor.
2. Select "Transition Effect" from settings.
3. Uncheck "Loop" on specific items to have them play only once per cycle (or session).
4. Save and Preview.

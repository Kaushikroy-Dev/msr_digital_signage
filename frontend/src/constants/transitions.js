/** Single source of playlist transition effects. Used by Playlists UI and MediaPlayer. */
export const TRANSITION_EFFECTS = [
    { value: 'fade', label: 'Fade' },
    { value: 'slide', label: 'Slide' },
    { value: 'wipe', label: 'Wipe' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'rotate', label: 'Rotate' },
    { value: 'dissolve', label: 'Dissolve' },
    { value: 'blur', label: 'Blur' },
    { value: 'slideUp', label: 'Slide Up' },
    { value: 'slideDown', label: 'Slide Down' },
    { value: 'slideLeft', label: 'Slide Left' },
    { value: 'slideRight', label: 'Slide Right' },
    { value: 'flip', label: 'Flip' },
    { value: 'scaleDown', label: 'Scale Down' },
    { value: 'bounce', label: 'Bounce' },
    { value: 'none', label: 'None' }
];

/** Valid effect values for validation/fallback. */
export const TRANSITION_EFFECT_VALUES = TRANSITION_EFFECTS.map(e => e.value);

/** Default effect when backend sends unknown or missing value. */
export const DEFAULT_TRANSITION_EFFECT = 'fade';

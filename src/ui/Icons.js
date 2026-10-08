/**
 * Flapcrypt Vector Icon System
 * Standardized on 24x24 viewBox, stroke-width 2.2, round caps & joins, currentColor.
 * Inspired by Grid Leap Icon & Symbol Inventory.
 */

export const Icons = {
  /**
   * Trophy (Achievements)
   */
  trophy: (size = 20) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.45 1-1 1H7 M14 14.66V17c0 .55.45 1 1 1h2 M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  `,

  /**
   * Trophy Prize Medal Emblem (dimmed & scaled down)
   */
  laurelTrophy: (size = 64) => `
    <svg class="ui-icon laurel-trophy-svg" width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="trophyBackGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#D99B26" stop-opacity="0.22"/>
          <stop offset="75%" stop-color="#9A6B1A" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#9A6B1A" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Soft Dimmed Ambient Halo Disc -->
      <circle cx="60" cy="60" r="54" fill="url(#trophyBackGlow)"/>

      <!-- Base & Pedestal (Gentle Antique Gold) -->
      <path fill="#DE9F31" opacity="0.9" d="M74.5,101.6h-5.3v-2c0-0.8-0.6-1.4-1.4-1.4H65l-1-7.3h2.2c0.8,0,1.4-0.6,1.4-1.4s-0.6-1.4-1.4-1.4h-2.6 l-0.3-2h-6.9l-0.3,2h-2.6c-0.8,0-1.4,0.6-1.4,1.4s0.6,1.4,1.4,1.4h2.2l-1,7.3h-2.8c-0.8,0-1.4,0.6-1.4,1.4v2h-5.3 c-2,0-3.6,1.6-3.6,3.6v4.5H78v-4.5C78.1,103.2,76.5,101.6,74.5,101.6z"/>
      
      <!-- Handles Left & Right -->
      <path fill="#DE9F31" opacity="0.9" d="M75.7,30.1v6h25V51c-1.4,2.6-8.5,14-29,11.5l-0.7,6c2.3,0.3,4.5,0.4,6.6,0.4c22,0,28.7-15.3,29-16l0.2-0.6 V30.1H75.7z"/>
      <path fill="#DE9F31" opacity="0.9" d="M48.9,68.4l-0.7-6c-20.5,2.6-27.7-8.9-29-11.5V36.1h25v-6h-31v22.2l0.2,0.6c0.3,0.7,7,16,29,16 C44.4,68.8,46.6,68.7,48.9,68.4z"/>

      <!-- Dimmed Subdued Ribbons -->
      <polygon fill="#5C7BB8" opacity="0.8" points="81.3,30.1 81.3,93.1 88.4,87.1 95.5,93.1 95.5,30.1"/>
      <polygon fill="#5C7BB8" opacity="0.8" points="24.4,93.1 31.5,87.1 38.6,93.1 38.6,30.1 24.4,30.1"/>

      <!-- Cup Chalice Body -->
      <path fill="#E6A838" opacity="0.92" d="M60,89.3L60,89.3c-16.4,0-29.7-13.3-29.7-29.7v-40h59.3v40C89.6,76,76.3,89.3,60,89.3z"/>

      <!-- Star Medal Emblem in Center -->
      <path fill="#BF8424" d="M60.6,36.5l3.8,7.6c0.1,0.2,0.3,0.4,0.6,0.4l8.4,1.2c0.6,0.1,0.8,0.8,0.4,1.3l-6.1,5.9 c-0.2,0.2-0.3,0.4-0.2,0.7l1.4,8.4c0.1,0.6-0.5,1.1-1.1,0.8l-7.5-4c-0.2-0.1-0.5-0.1-0.7,0l-7.5,4c-0.5,0.3-1.2-0.2-1.1-0.8 l1.4-8.4c0-0.2,0-0.5-0.2-0.7L46.1,47c-0.4-0.4-0.2-1.2,0.4-1.3l8.4-1.2c0.2,0,0.4-0.2,0.6-0.4l3.8-7.6 C59.6,35.9,60.3,35.9,60.6,36.5z"/>
    </svg>
  `,

  /**
   * 4-Rounded-Dots Grid (Level Select Dock)
   */
  gridFourDots: (size = 20) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="2"/>
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="2"/>
      <rect x="14" y="14" width="6.5" height="6.5" rx="2"/>
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="2"/>
    </svg>
  `,

  /**
   * Radiant Lightbulb with Outward Rays (Mockup Hints)
   */
  bulbRays: (size = 20) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 18h6 M10 21h4 M15 13a4.5 4.5 0 1 0-6 0c.8.8 1 1.6 1 3h4c0-1.4.2-2.2 1-3z"/>
      <line x1="12" y1="2" x2="12" y2="4"/>
      <line x1="4.22" y1="5.22" x2="5.64" y2="6.64"/>
      <line x1="19.78" y1="5.22" x2="18.36" y2="6.64"/>
      <line x1="2" y1="12" x2="4" y2="12"/>
      <line x1="20" y1="12" x2="22" y2="12"/>
    </svg>
  `,

  /**
   * Circle Checkmark (Mockup Solved Letters)
   */
  checkCircle: (size = 20) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  `,

  /**
   * Question Mark Circle (How to Play / Help)
   */
  help: (size = 20) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2.6"/>
    </svg>
  `,

  /**
   * Mechanical Gear (Settings)
   */
  gear: (size = 20) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  `,

  /**
   * Home Hub Shortcut
   */
  home: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  `,

  /**
   * Play Action Triangle
   */
  play: (size = 16) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <polygon points="6 3 20 12 6 21 6 3"/>
    </svg>
  `,

  /**
   * Shopping Cart (Shop)
   */
  shop: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  `,

  /**
   * Bar Chart (Statistics)
   */
  stats: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  `,

  /**
   * Sound / Volume State
   */
  sound: (enabled = true, size = 18) => enabled ? `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(243, 237, 226, 0.15)"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  ` : `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  `,

  /**
   * Lightbulb (Hint)
   */
  hint: (size = 16) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
      <path d="M15.09 13.72A6 6 0 1 0 8.91 13.72 M12 2v2"/>
    </svg>
  `,

  /**
   * Left Navigation Chevron
   */
  chevronLeft: (size = 16) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  `,

  /**
   * Right Navigation Chevron
   */
  chevronRight: (size = 16) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  `,

  /**
   * Upward Stepper Chevron
   */
  chevronUp: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  `,

  /**
   * Downward Stepper Chevron
   */
  chevronDown: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  `,

  /**
   * Letter Group Status Icon (Split-Flap Tile Outline)
   */
  flapTile: (size = 15) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" ry="3"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  `,

  /**
   * Close / Dismiss Cross (Modals)
   */
  close: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  `,

  /**
   * Lock (Fixed Clue / Locked Status)
   */
  lock: (size = 16) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  `,

  /**
   * Medal / Star (Achievement Unlocked)
   */
  medal: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="6"/>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  `,

  /**
   * Checkmark (Solved / Active)
   */
  check: (size = 16) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `,

  /**
   * Restart / Reset Level (Counter-clockwise reload arrow)
   */
  restart: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  `,

  /**
   * Calendar (Daily Challenge Dispatch)
   */
  calendar: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  `,

  /**
   * Flame (Daily Streak)
   */
  flame: (size = 16) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>
    </svg>
  `,

  /**
   * Haptic Vibration (Phone / Pulse Wave)
   */
  vibrate: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="7" y="2" width="10" height="20" rx="2" ry="2"/>
      <line x1="2" y1="8" x2="2" y2="16"/>
      <line x1="22" y1="8" x2="22" y2="16"/>
      <line x1="11" y1="18" x2="13" y2="18"/>
    </svg>
  `,

  /**
   * Notification Bell (Daily Reminders)
   */
  bell: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  `,

  /**
   * Sparkles / Diamond (Remove Ads / Premium)
   */
  sparkles: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/>
    </svg>
  `,

  /**
   * Star (Rate Us)
   */
  star: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  `,

  /**
   * Mail Envelope (Contact Support)
   */
  mail: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  `,

  /**
   * External Link Arrow (Grid Leap 1.5)
   */
  externalLink: (size = 14) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  `,

  /**
   * Shield (Privacy Policy)
   */
  shield: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  `,

  /**
   * Information Circle (About)
   */
  info: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  `,

  /**
   * Chevron Right (Navigation Row)
   */
  chevronRight: (size = 16) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  `,

  /**
   * Grid (Level Select)
   */
  grid: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  `,

  /**
   * Clock / Stopwatch (Timer)
   */
  clock: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  `,

  /**
   * Flame (Streak)
   */
  flame: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  `,

  /**
   * Arrow Right (Advance Next Level)
   */
  arrowRight: (size = 18) => `
    <svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  `
};



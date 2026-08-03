// Generated from docs/design/design-tokens.json. Do not edit directly.

export const tokens = {
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "meta": {
    "name": "CineWrapped",
    "version": "0.1.0",
    "baseUnit": 4,
    "brandConfigurable": true
  },
  "color": {
    "primitive": {
      "ink": {
        "50": "#F7F5F0",
        "100": "#E8E6E1",
        "300": "#A9ACB8",
        "500": "#707482",
        "700": "#333643",
        "800": "#1A1D28",
        "900": "#12141C",
        "950": "#090A0F"
      },
      "gold": {
        "100": "#FFF0C7",
        "300": "#FFD77F",
        "400": "#FFC65C",
        "600": "#B86B00",
        "700": "#8A4E00",
        "950": "#211600"
      },
      "violet": {
        "200": "#C9C2FF",
        "400": "#8C7CFF",
        "700": "#5142C2"
      },
      "green": {
        "400": "#4FD1A5",
        "700": "#087A5B"
      },
      "red": {
        "400": "#FF7A88",
        "700": "#B4233A"
      },
      "amber": {
        "400": "#F6C85F",
        "800": "#73510A"
      },
      "white": "#FFFFFF",
      "black": "#000000",
      "transparent": "#00000000"
    },
    "semantic": {
      "dark": {
        "background": "#090A0F",
        "surface": "#12141C",
        "surfaceRaised": "#1A1D28",
        "surfaceOverlay": "#242735",
        "border": "#333643",
        "borderStrong": "#555968",
        "textPrimary": "#F7F5F0",
        "textSecondary": "#A9ACB8",
        "textDisabled": "#707482",
        "brand": "#FFC65C",
        "brandPressed": "#E6A93A",
        "onBrand": "#211600",
        "accent": "#8C7CFF",
        "onAccent": "#090A0F",
        "success": "#4FD1A5",
        "onSuccess": "#062C22",
        "warning": "#F6C85F",
        "onWarning": "#2A1D00",
        "danger": "#FF7A88",
        "onDanger": "#31070D",
        "focus": "#FFD77F",
        "scrim": "#000000B8",
        "posterScrimStart": "#090A0F00",
        "posterScrimEnd": "#090A0FF2"
      },
      "light": {
        "background": "#F7F5F0",
        "surface": "#FFFFFF",
        "surfaceRaised": "#EFECE5",
        "surfaceOverlay": "#FFFFFF",
        "border": "#D4D0C8",
        "borderStrong": "#8B8D97",
        "textPrimary": "#171820",
        "textSecondary": "#5E6170",
        "textDisabled": "#858894",
        "brand": "#8A4E00",
        "brandPressed": "#6F3E00",
        "onBrand": "#FFFFFF",
        "accent": "#5142C2",
        "onAccent": "#FFFFFF",
        "success": "#087A5B",
        "onSuccess": "#FFFFFF",
        "warning": "#73510A",
        "onWarning": "#FFFFFF",
        "danger": "#B4233A",
        "onDanger": "#FFFFFF",
        "focus": "#5142C2",
        "scrim": "#0000008F",
        "posterScrimStart": "#090A0F00",
        "posterScrimEnd": "#090A0FEF"
      }
    }
  },
  "typography": {
    "fontFamily": {
      "display": "Plus Jakarta Sans",
      "body": "Inter",
      "systemFallback": "System"
    },
    "fontWeight": {
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    "fontSize": {
      "caption": 12,
      "labelSmall": 13,
      "bodySmall": 14,
      "body": 16,
      "bodyLarge": 18,
      "titleSmall": 20,
      "title": 24,
      "headline": 32,
      "display": 40,
      "hero": 48
    },
    "lineHeight": {
      "caption": 16,
      "labelSmall": 18,
      "bodySmall": 20,
      "body": 24,
      "bodyLarge": 28,
      "titleSmall": 26,
      "title": 31,
      "headline": 38,
      "display": 48,
      "hero": 56
    },
    "letterSpacing": {
      "tight": -0.4,
      "normal": 0,
      "label": 0.2,
      "eyebrow": 0.8
    }
  },
  "space": {
    "0": 0,
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "8": 32,
    "10": 40,
    "12": 48,
    "16": 64,
    "20": 80,
    "24": 96
  },
  "radius": {
    "none": 0,
    "small": 6,
    "medium": 10,
    "large": 16,
    "xlarge": 24,
    "pill": 999
  },
  "borderWidth": {
    "hairline": 1,
    "strong": 2,
    "focus": 3
  },
  "shadow": {
    "none": {
      "color": "#00000000",
      "offsetX": 0,
      "offsetY": 0,
      "blur": 0,
      "spread": 0,
      "opacity": 0,
      "elevation": 0
    },
    "small": {
      "color": "#000000",
      "offsetX": 0,
      "offsetY": 2,
      "blur": 8,
      "spread": 0,
      "opacity": 0.16,
      "elevation": 2
    },
    "medium": {
      "color": "#000000",
      "offsetX": 0,
      "offsetY": 8,
      "blur": 24,
      "spread": 0,
      "opacity": 0.22,
      "elevation": 8
    },
    "large": {
      "color": "#000000",
      "offsetX": 0,
      "offsetY": 16,
      "blur": 48,
      "spread": 0,
      "opacity": 0.28,
      "elevation": 16
    }
  },
  "motion": {
    "duration": {
      "instant": 0,
      "fast": 120,
      "standard": 220,
      "slow": 360,
      "celebration": 700
    },
    "easing": {
      "standard": [
        0.2,
        0,
        0,
        1
      ],
      "enter": [
        0,
        0,
        0,
        1
      ],
      "exit": [
        0.3,
        0,
        1,
        1
      ]
    },
    "spring": {
      "responsive": {
        "damping": 20,
        "stiffness": 260,
        "mass": 0.8
      },
      "gentle": {
        "damping": 24,
        "stiffness": 170,
        "mass": 1
      }
    },
    "reducedMotionDuration": 0
  },
  "size": {
    "touchTargetIos": 44,
    "touchTargetAndroid": 48,
    "controlSmall": 36,
    "controlMedium": 44,
    "controlLarge": 52,
    "tabBar": 64,
    "posterMinWidth": 136,
    "avatarSmall": 24,
    "avatarMedium": 40,
    "avatarLarge": 72,
    "avatarHero": 104
  },
  "iconSize": {
    "small": 16,
    "medium": 20,
    "large": 24,
    "xlarge": 32
  },
  "breakpoint": {
    "compact": 0,
    "phoneWide": 480,
    "tablet": 768,
    "desktopLike": 1200
  },
  "contentWidth": {
    "reading": 720,
    "discovery": 1200
  },
  "zIndex": {
    "base": 0,
    "sticky": 100,
    "tabBar": 200,
    "sheet": 400,
    "modal": 500,
    "toast": 600,
    "critical": 700
  },
  "opacity": {
    "disabled": 0.48,
    "secondary": 0.72,
    "pressed": 0.88
  },
  "aspectRatio": {
    "poster": 0.6666667,
    "backdrop": 1.7777778,
    "wrapStory": 0.5625
  }
} as const;

export type DesignTokens = typeof tokens;

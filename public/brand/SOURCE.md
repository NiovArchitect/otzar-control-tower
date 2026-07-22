# Otzar brand assets

Official mark sourced from:

- Product site: https://www.otzar.ai/
- Brand identity gallery: https://www.behance.net/gallery/252799665/OTZAR
- Key module (floating UI / soft light): https://www.behance.net/gallery/252799665/OTZAR/modules/1469274733

Do not invent a replacement logo.

| Asset | Use |
|-------|-----|
| `otzar-logo.png` (1080²) | Brand / hero 3D polished mark |
| `otzar-logo.svg` | Monochrome ink/silver chrome only |
| `otzar-mark.jpg` | Legacy raster reference only |

## Official palette

| Token | Hex | Role |
|-------|-----|------|
| Brand purple | `#B124E8` | Primary CTA, focus, active nav |
| Mid purple | `#a855f7` | Secondary accent, luminous mid |
| Brand blue | `#405DE6` | Listening / secondary spectrum |
| Brand dark | `#1e1b4b` | Primary text / ink |
| Silver | `#E5E7EC` | Semi-gradient field base |
| White | `#FFFFFF` | Floating cards, chrome |
| Accent orange | `#F77737` | Attention only (sparse) |

## Product UI doctrine (complete overhaul)

From Behance comps — **bright enterprise**, not black void:

1. **Semi-gradient field** — silver → soft lavender → pearl with purple ribbon washes (YC-visible brand experience)
2. **Floating white cards** — soft multi-layer light shadows, generous curves (`1.5rem`+)
3. **3D buttons** — solid purple CTAs with lift shadow; ghost white secondary pills
4. **Sizing** — touch-friendly `h-11` / `h-12` controls, pill radii, airy page spacing
5. **Type** — brand-dark ink on pearl; purple eyebrows; luminous purple titles

Materials live in `src/index.css` + `src/lib/ambient/glass.ts`.

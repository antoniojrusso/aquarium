# STILLWATER — A Living Koi Sanctuary

An interactive, real-time 3D koi aquarium. Designed as a quiet space to explore rather than a competitive game.

**[Open the GitHub Pages staging site](https://antoniojrusso.github.io/aquarium/)** · [Source repository](https://github.com/antoniojrusso/aquarium)

## What's inside

- **Procedural 3D koi** — seven distinct koi varieties, individually patterned canvas textures, smooth swim steering, active tail motion, detailed fins, eyes and barbels.
- **Living aquascape** — river stones, pebbles, sand, driftwood, animated water plants and rising bubbles.
- **Water and light** — GLSL shader water surface, moving caustics, transparent glass and soft shafts of underwater light.
- **Care interactions** — introduce new koi, feed them, monitor simulated habitat wellbeing, and select a fish to follow.
- **Photography and calm** — snapshot PNGs, four atmosphere presets, optional synthesized underwater ambience, adjustable clarity.
- **Responsive, accessible UI** — pointer/touch orbit controls, keyboard shortcuts, ARIA labels, mobile layout, reduced-motion preferences.
- **Private local persistence** — remembers the aquarium atmosphere, water clarity and koi count via browser local storage. No server or analytics.

## How to run

This is a **static site** built with native JavaScript modules. It doesn't require Node, React, a build step, or paid hosting. Three.js r187 and the official OrbitControls module load from a version-pinned jsDelivr CDN. Browser internet access is required to load these modules and the optional fonts.

To run locally, serve the folder through HTTP (do not open `file://`):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in a modern WebGL 2 browser. You can also use VS Code Live Server.

## GitHub Pages staging

The `.github/workflows/deploy.yml` workflow publishes the static site after each push to `main` and can also be triggered manually. To enable it on a new GitHub repository:

1. Open **Settings → Pages** for `antoniojrusso/aquarium`.
2. Set **Build and deployment → Source → GitHub Actions**.
3. Run **Actions → Deploy Stillwater to GitHub Pages → Run workflow** if the deployment hasn't started.
4. Once complete, open **https://antoniojrusso.github.io/aquarium/**.

GitHub Pages supports **one public Pages site per repository**. This URL is the staging environment; add a domain or create a separate production repository if you later want separate production and staging deployments. The code is also path-relative so it works under `/aquarium/`.

## Controls

| Action | Control |
| --- | --- |
| Explore | Drag/swipe to orbit |
| Zoom | Scroll or pinch |
| Feed koi | **F** or the Feed button |
| Photograph | **P** or the camera button |
| Reset camera | **R** or Reset Your View |
| Follow koi | Select a koi in the bottom dock |
| Atmosphere | Dawn, day, dusk, night in the left panel |
| Ambient sound | Sound button, off by default |

## Structure

- `index.html` — application shell and accessible controls.
- `src/styles.css` — full responsive interface.
- `src/main.js` — UI state, persistence, sound and input handling.
- `src/world.js` — Three.js renderer, lights, camera, koi behavior and feeding.
- `src/koi.js` — procedural koi models, scale textures and animation.
- `src/aquascape.js` — rocks, plants, surface shaders, caustics, glass and particles.
- `.github/workflows/deploy.yml` — continuous Pages deployment.

## Performance and scope

The app is designed for modern desktop and mobile browsers with WebGL 2, adaptive pixel ratio and efficient instancing for small particles and pebbles. GPU speed and battery life will vary by device. The environmental readings are **simulated app values**, not sensor measurements. Koi are procedural, artistically directed models rather than scanned or cinematographically ray-traced fish.

All application code in this repository is yours to extend. Third-party Three.js and optional Google Fonts are loaded under their respective open-source licenses.
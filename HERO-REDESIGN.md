# Hero redesign: changed files

New
- components/home/hero-slideshow.tsx   cross-fading photos, pause and dots. Change SLIDE_MS (top of file) to set how long each photo stays.
- components/home/hero-headline.tsx    words rise out of a soft blur, one after the other
- public/landing/hero-{1,2,3}-{1280,1920,2576}.webp   the three photos at three sizes (browser picks the sharpest it needs)

Edited
- app/page.tsx      hero section only (everything below it is untouched). KenyaCollage import removed.
- app/globals.css   one block added at the very end ("Home hero"). Nothing existing was changed.

Left in place, now unused by the hero
- components/home/kenya-collage.tsx and public/landing/tile-*.webp   (kept so you can roll back; safe to delete later)

Roll back: restore app/page.tsx from git and delete the "Home hero" block at the end of app/globals.css.

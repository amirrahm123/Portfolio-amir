// Resolves a project's image basename (e.g. "amirballbot") to a real bundled
// asset URL, matching ANY extension found in src/assets/projects.
//
// This is why swapping a placeholder for a real screenshot is a one-file change:
// drop `amirballbot.png` (or `.gif`, `.jpg`, `.webp`) into src/assets/projects/
// and it is picked up automatically — no edits to data or components.

const modules = import.meta.glob('../assets/projects/*.{png,jpg,jpeg,gif,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

// Map of basename -> resolved URL.
const byBasename: Record<string, string> = {};
for (const path in modules) {
  const file = path.split('/').pop() ?? '';
  const basename = file.replace(/\.[^.]+$/, '');
  byBasename[basename] = modules[path];
}

/** Returns the asset URL for a basename, or null if no file has been added yet. */
export function resolveProjectImage(basename: string): string | null {
  return byBasename[basename] ?? null;
}

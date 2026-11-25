// Client-safe (no server imports) so the admin editor can preview images exactly as readers see them.

/**
 * Converts Google Drive share links to directly embeddable image URLs.
 * Other URLs are returned unchanged.
 */
export function normalizeImageUrl(url: string): string {
  const m =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) ||
    url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

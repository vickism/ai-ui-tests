/**
 * Filename/directory-name sanitization, shared by the memory store and the
 * screenshot reporter so both produce identical, filesystem-safe slugs.
 */

/**
 * Max slug length. Test names in AI UI Tests are the full (often multi-line) test
 * description, which can run to hundreds of characters. Left uncapped, the
 * resulting directory path blows past Windows' 260-char MAX_PATH limit and
 * `fs.mkdirSync` fails with ENOENT. Capping the slug keeps deep paths well
 * under that limit.
 */
const MAX_SLUG_LENGTH = 80

/**
 * Sanitize a name for use as a directory or file name.
 * Lowercase, replace non-alphanumeric runs with dashes, trim dashes, then
 * truncate to MAX_SLUG_LENGTH (trimming any trailing dash left by the cut).
 */
export function sanitizeName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (slug.length <= MAX_SLUG_LENGTH) return slug
  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '')
}

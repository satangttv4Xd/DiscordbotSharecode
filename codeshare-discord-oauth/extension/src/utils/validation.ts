/**
 * Validate that a string looks like a usable backend base URL.
 * Returns an error message, or undefined when valid.
 */
export function validateBackendUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Backend URL is empty.';
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'Backend URL is not a valid URL.';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'Backend URL must start with http:// or https://';
  }
  return undefined;
}

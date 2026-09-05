export function fetchAssetText(
  urls: string[],
  options?: { timeoutMs?: number; maxBytes?: number },
): Promise<string>;

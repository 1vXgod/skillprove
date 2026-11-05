const DEV_API_PORT = 4000;

/**
 * A phone cannot reach the computer through "localhost". In development, the API is
 * found on the same host that served the bundle. Production builds must set the URL.
 */
export function resolveApiBaseUrl(options: {
  configuredUrl: string | undefined;
  expoHostUri: string | undefined;
  isDevelopment: boolean;
}): string | null {
  if (options.configuredUrl) return options.configuredUrl;
  if (!options.isDevelopment || !options.expoHostUri) return null;

  const [hostname] = options.expoHostUri.split(":");
  return `http://${hostname}:${DEV_API_PORT}`;
}

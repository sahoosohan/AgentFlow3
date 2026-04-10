const runtimeConfig = globalThis.window?.__APP_CONFIG__ || {};

const resolveConfigValue = (runtimeValue, buildValue, fallback = "") => {
  if (typeof runtimeValue === "string" && runtimeValue.trim()) {
    return runtimeValue.trim();
  }
  if (typeof buildValue === "string" && buildValue.trim()) {
    return buildValue.trim();
  }
  return fallback;
};

export const appConfig = {
  apiUrl: resolveConfigValue(
    runtimeConfig.VITE_API_URL,
    import.meta.env.VITE_API_URL,
    "/api"
  ),
  supabaseUrl: resolveConfigValue(
    runtimeConfig.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_URL
  ),
  supabaseAnonKey: resolveConfigValue(
    runtimeConfig.VITE_SUPABASE_ANON_KEY,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  ),
};

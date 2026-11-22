/* Cliente Supabase para el prototipo estático. Requiere config.js + CDN @supabase/supabase-js. */
(function () {
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error("Falta CDN de supabase-js o config.js");
    window.db = null;
    return;
  }
  window.db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
})();

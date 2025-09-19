<script type="module">
  import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  // 🔧 Your real Supabase values
  const SUPABASE_URL = "https://arzddicguiydfvtwewlq.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyemRkaWNndWl5ZGZ2dHdld2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzA5NDcsImV4cCI6MjA3MzAwNjk0N30.UjZj0XeB8BtjSDsFyf9swxHA26OniI1Mk1ddgSTUXYg";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const authBtn   = document.getElementById("authBtn");
  const myJobsBtn = document.getElementById("myJobsBtn");
  const postBtn   = document.getElementById("postJobBtn");

  async function initAuthUI() {
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const user = session?.user || null;

      if (authBtn) {
        authBtn.textContent = user ? "Sign Out" : "Sign In";
        authBtn.href = user ? "#" : "auth.html";
        authBtn.onclick = user ? async (e) => {
          e.preventDefault();
          if (!confirm("Are you sure you want to sign out?")) return;
          await supabase.auth.signOut();
          location.href = "index.html";
        } : null;
      }

      // Gate protected pages if signed out
      const gate = (el, target) => el && el.addEventListener("click", (e) => {
        if (!user) {
          e.preventDefault();
          location.href = `auth.html?mode=signin&returnTo=${encodeURIComponent(target)}`;
        }
      });
      gate(myJobsBtn, "my-jobs.html");
      gate(postBtn,   "post-job.html");
    } catch {
      if (authBtn) { authBtn.textContent = "Sign In"; authBtn.href = "auth.html"; authBtn.onclick = null; }
    }
  }

  initAuthUI();
  supabase.auth.onAuthStateChange(() => initAuthUI());
</script>

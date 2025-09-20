<script type="module">
  import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  // ⛳️ Your real Supabase values (keep anon, never service role)
  const SUPABASE_URL = "https://arzddicguiydfvtwewlq.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyemRkaWNndWl5ZGZ2dHdld2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzA5NDcsImV4cCI6MjA3MzAwNjk0N30.UjZj0XeB8BtjSDsFyf9swxHA26OniI1Mk1ddgSTUXYg";

  // Helpful for GitHub Pages subpaths (e.g. user.github.io/repo/)
  const ORIGIN = window.location.origin;
  const BASE   = document.querySelector('base')?.href || ORIGIN + (window.location.pathname.includes('/') ? window.location.pathname.replace(/\/[^/]*$/, '/') : '/');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  // Optional: make available globally if other inline scripts need it
  window.supabase = supabase;

  // ⚙️ Utility: robust navigation to a site-relative page (honors subpaths)
  const go = (page) => window.location.assign(new URL(page, BASE).toString());

  // Optional: remove OAuth params after Supabase handled them
  const cleanAuthParams = () => {
    const u = new URL(window.location.href);
    if (u.hash.includes('access_token=') || u.searchParams.has('code')) {
      history.replaceState({}, "", u.pathname); // keep clean URL
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const authBtn   = document.getElementById("authBtn");     // <a> Sign In/Out
    const myJobsBtn = document.getElementById("myJobsBtn");   // <a> My Jobs
    const postBtn   = document.getElementById("postJobBtn");  // <a> Post Job
    const verifyBtn = document.getElementById("verifyBtnNav");// <a> Verify Company

    // Ensure verify link points somewhere even when hidden
    if (verifyBtn) verifyBtn.href = "verify.html";

    // Avoid stacking listeners across state changes
    const removeAllHandlers = () => {
      if (authBtn)   authBtn.replaceWith(authBtn.cloneNode(true));
      if (myJobsBtn) myJobsBtn.replaceWith(myJobsBtn.cloneNode(true));
      if (postBtn)   postBtn.replaceWith(postBtn.cloneNode(true));
      if (verifyBtn) verifyBtn.replaceWith(verifyBtn.cloneNode(true));
    };

    // Re-query after cloning
    const refreshEls = () => {
      return {
        authBtn:   document.getElementById("authBtn"),
        myJobsBtn: document.getElementById("myJobsBtn"),
        postBtn:   document.getElementById("postJobBtn"),
        verifyBtn: document.getElementById("verifyBtnNav"),
      };
    };

    const gate = (el, target) => {
      if (!el) return;
      el.addEventListener("click", (e) => {
        const logged = localStorage.getItem("hs_authed")==="1";
        if (!logged) {
          e.preventDefault();
          const returnTo = encodeURIComponent(target || window.location.pathname.replace(/^\//,""));
          go(`auth.html?mode=signin&returnTo=${returnTo}`);
        }
      });
    };

    function applyUI(isLoggedIn){
      removeAllHandlers();
      const { authBtn, myJobsBtn, postBtn, verifyBtn } = refreshEls();

      if (authBtn){
        authBtn.textContent = isLoggedIn ? "Sign Out" : "Sign In";
        authBtn.href        = isLoggedIn ? "#" : "auth.html";
        if (isLoggedIn){
          authBtn.addEventListener("click", async (e)=>{
            e.preventDefault();
            const ok = confirm("Are you sure you want to sign out?");
            if (!ok) return;
            await supabase.auth.signOut();
            localStorage.setItem("hs_authed","0");
            go("index.html");
          });
        }
      }

      if (verifyBtn){
        verifyBtn.style.display = isLoggedIn ? "" : "none";
        // when signed in, this is a normal link to verify.html (more logic will live there)
      }

      // Gate protected pages when signed out
      if (!isLoggedIn){
        gate(myJobsBtn, "my-jobs.html");
        gate(postBtn,   "post-job.html");
      }
    }

    // 🔹 Anti-flicker: optimistic state from last session
    const cached = localStorage.getItem("hs_authed") === "1";
    applyUI(cached);

    // 🔹 Real state from Supabase
    (async ()=>{
      try{
        const { data:{ session } } = await supabase.auth.getSession();
        const isLoggedIn = !!session?.user;
        applyUI(isLoggedIn);
        localStorage.setItem("hs_authed", isLoggedIn ? "1" : "0");
        cleanAuthParams();
      }catch{
        applyUI(false);
        localStorage.setItem("hs_authed","0");
      }
    })();

    // Live updates while on page
    supabase.auth.onAuthStateChange((_e, session)=>{
      const isLoggedIn = !!session?.user;
      applyUI(isLoggedIn);
      localStorage.setItem("hs_authed", isLoggedIn ? "1" : "0");
    });
  });
</script>

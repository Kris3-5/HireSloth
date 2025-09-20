// nav.js
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
const verifyBtn = document.getElementById("verifyBtnNav"); // <-- we toggle this

function applyUI(isLoggedIn){
  if (authBtn){
    authBtn.textContent = isLoggedIn ? "Sign Out" : "Sign In";
    authBtn.href        = isLoggedIn ? "#" : "auth.html";
    authBtn.onclick     = isLoggedIn ? async (e)=>{
      e.preventDefault();
      if (!confirm("Are you sure you want to sign out?")) return;
      await supabase.auth.signOut();
      localStorage.setItem("hs_authed","0");
      location.href = "index.html";
    } : null;
  }

  if (verifyBtn){
    // Force a concrete display value so we override any CSS defaults
    verifyBtn.hidden = !isLoggedIn;
    verifyBtn.style.display = isLoggedIn ? "inline-block" : "none";
  }

  // Gate protected pages when signed out
  const gate = (el, target) => el && el.addEventListener("click", (e) => {
    const logged = isLoggedIn || localStorage.getItem("hs_authed")==="1";
    if (!logged) {
      e.preventDefault();
      location.href = `auth.html?mode=signin&returnTo=${encodeURIComponent(target)}`;
    }
  }, { once:true });
  gate(myJobsBtn, "my-jobs.html");
  gate(postBtn,   "post-job.html");
}

// 🔹 Anti-flicker: optimistic state from last session
const cached = localStorage.getItem("hs_authed") === "1";
applyUI(cached);

// 🔹 Real state from Supabase; then keep cache in sync
(async ()=>{
  try{
    const { data:{ session } } = await supabase.auth.getSession();
    const isLoggedIn = !!session?.user;
    applyUI(isLoggedIn);
    localStorage.setItem("hs_authed", isLoggedIn ? "1" : "0");
  }catch{
    applyUI(false);
    localStorage.setItem("hs_authed","0");
  }
})();

// Keep UI fresh if auth changes on-page
supabase.auth.onAuthStateChange((_e, session)=>{
  const isLoggedIn = !!session?.user;
  applyUI(isLoggedIn);
  localStorage.setItem("hs_authed", isLoggedIn ? "1" : "0");
});

// nav.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://arzddicguiydfvtwewlq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyemRkaWNndWl5ZGZ2dHdld2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzA5NDcsImV4cCI6MjA3MzAwNjk0N30.UjZj0XeB8BtjSDsFyf9swxHA26OniI1Mk1ddgSTUXYg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// DOM refs
const authBtn   = document.getElementById("authBtn");
const myJobsBtn = document.getElementById("myJobsBtn");
const postBtn   = document.getElementById("postJobBtn");

function applyUI(isLoggedIn){
  if (authBtn){
    authBtn.textContent = isLoggedIn ? "Sign Out" : "Sign In";
    authBtn.href        = isLoggedIn ? "#" : "auth.html";
    authBtn.onclick     = isLoggedIn ? async (e)=>{
      e.preventDefault();
      if (!confirm("Sign out?")) return;
      await supabase.auth.signOut();
      localStorage.setItem("hs_authed","0");
      location.href = "index.html";
    } : null;
  }

  // Gate private pages when clicked while signed out
  const gate = (el, target) => el && el.addEventListener("click", (e) => {
    const logged = isLoggedIn || localStorage.getItem("hs_authed")==="1";
    if (!logged) {
      e.preventDefault();
      location.href = `auth.html?mode=signin&returnTo=${encodeURIComponent(target)}`;
    }
  });
  gate(myJobsBtn, "my-jobs.html");
  gate(postBtn,   "post-job.html");
}

// Anti-flicker (cached state)
applyUI(localStorage.getItem("hs_authed")==="1");

// Real state
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

supabase.auth.onAuthStateChange((_e, session)=>{
  const isLoggedIn = !!session?.user;
  applyUI(isLoggedIn);
  localStorage.setItem("hs_authed", isLoggedIn ? "1" : "0");
});

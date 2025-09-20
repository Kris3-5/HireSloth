// nav.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// 🔧 Your real Supabase values
const SUPABASE_URL = "https://arzddicguiydfvtwewlq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyemRkaWNndWl5ZGZ2dHdld2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzA5NDcsImV4cCI6MjA3MzAwNjk0N30.UjZj0XeB8BtjSDsFyf9swxHA26OniI1Mk1ddgSTUXYg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// --- DOM refs ---
const authBtn   = document.getElementById("authBtn");
const myJobsBtn = document.getElementById("myJobsBtn");
const postBtn   = document.getElementById("postJobBtn");

// Ensure the Verify button exists in the nav (create if missing)
function ensureVerifyBtn() {
  let verifyBtn = document.getElementById("verifyBtnNav");
  if (!verifyBtn) {
    const nav = document.querySelector("header nav");
    if (nav) {
      verifyBtn = document.createElement("a");
      verifyBtn.id = "verifyBtnNav";
      verifyBtn.className = "btn";
      verifyBtn.href = "verify.html";
      verifyBtn.textContent = "Get Verified";
      // Insert before authBtn if present, else at end
      if (authBtn && authBtn.parentElement === nav) {
        nav.insertBefore(verifyBtn, authBtn);
      } else {
        nav.appendChild(verifyBtn);
      }
    }
  }
  return verifyBtn;
}

const verifyBtn = ensureVerifyBtn();

// --- UI & gating ---
function applyUI(isLoggedIn){
  // Keep nav button always visible; we only gate the click.
  if (verifyBtn) {
    verifyBtn.style.display = "inline-block"; // force visible regardless of CSS
    // Gate: if not logged, redirect to sign-in before going to verify.html
    verifyBtn.onclick = (e) => {
      const logged = isLoggedIn || localStorage.getItem("hs_authed")==="1";
      if (!logged) {
        e.preventDefault();
        location.href = `auth.html?mode=signin&returnTo=${encodeURIComponent("verify.html")}`;
      }
      // if logged, normal navigation proceeds
    };
  }

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

  // Protect private pages when clicked while signed out
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

// Anti-flicker from cached flag
applyUI(localStorage.getItem("hs_authed")==="1");

// Real state, then keep cache in sync
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


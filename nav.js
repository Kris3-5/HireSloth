// nav.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.3/+esm";

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
      verifyBtn.href = "verify.html";          // default target (safe)
      verifyBtn.textContent = "Get Verified";
      // Insert before authBtn if present
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

// Optional: read a Stripe Payment Link if provided
function getPaymentLink() {
  // Highest priority: data-link on the anchor
  const fromData = verifyBtn?.dataset?.link;
  if (fromData) return fromData;
  // Next: global variable you can set inline in HTML if you like
  if (typeof window !== "undefined" && window.STRIPE_PAYMENT_LINK) {
    return String(window.STRIPE_PAYMENT_LINK);
  }
  return null; // fall back to verify.html
}

// --- UI & gating ---
function applyUI(isLoggedIn){
  // Always show the Verify button; gate the *click*, not visibility
  if (verifyBtn) {
    verifyBtn.style.display = "inline-block"; // belt-and-braces
    const paymentLink = getPaymentLink();

    verifyBtn.onclick = (e) => {
      const logged = isLoggedIn || localStorage.getItem("hs_authed")==="1";
      if (!logged) {
        e.preventDefault();
        // Safe on-site returnTo
        location.href = `auth.html?mode=signin&returnTo=${encodeURIComponent("verify.html")}`;
        return;
      }
      // Logged in: if payment link provided, go there; else follow href (verify.html)
      if (paymentLink) {
        e.preventDefault();
        location.href = paymentLink;
      }
      // else let default navigation proceed
    };
  }

  // Auth button
  if (authBtn){
    if (isLoggedIn) {
      authBtn.textContent = "Sign Out";
      authBtn.href = "#";
      authBtn.onclick = async (e) => {
        e.preventDefault();
        if (!confirm("Are you sure you want to sign out?")) return;
        await supabase.auth.signOut();
        localStorage.setItem("hs_authed","0");
        location.replace("index.html");
      };
    } else {
      authBtn.textContent = "Sign In";
      authBtn.href = "auth.html";
      authBtn.onclick = null;
    }
  }

  // Protect private pages when clicked while signed out
  const protect = (el, target) => {
    if (!el) return;
    el.onclick = (e) => {
      const logged = isLoggedIn || localStorage.getItem("hs_authed")==="1";
      if (!logged) {
        e.preventDefault();
        location.href = `auth.html?mode=signin&returnTo=${encodeURIComponent(target)}`;
      }
      // else allow default nav
    };
  };
  protect(myJobsBtn, "my-jobs.html");
  protect(postBtn,   "post-job.html");
}

// Anti-flicker from cached flag (best effort, overridden by real state later)
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

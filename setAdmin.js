import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://arzddicguiydfvtwewlq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyemRkaWNndWl5ZGZ2dHdld2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzA5NDcsImV4cCI6MjA3MzAwNjk0N30.UjZj0XeB8BtjSDsFyf9swxHA26OniI1Mk1ddgSTUXYg'; // Service Role key
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '815afb01-46cb-4c32-aa47-6441d82d018b'; // UUID of your user

async function setAdmin() {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'admin' }
  });

  if (error) console.error(error);
  else console.log('Admin role set:', data);
}

setAdmin();

import { createClient } from '@supabase/supabase-js';

// Replace with your values
const supabaseUrl = 'https://arzddicguiydfvtwewlq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyemRkaWNndWl5ZGZ2dHdld2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MzA5NDcsImV4cCI6MjA3MzAwNjk0N30.UjZj0XeB8BtjSDsFyf9swxHA26OniI1Mk1ddgSTUXYg';
const userId = '815afb01-46cb-4c32-aa47-6441d82d018b'; // UUID of your user

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function makeAdmin() {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'admin' }
  });

  if (error) console.error('Error:', error);
  else console.log('Admin role assigned:', data);
}

makeAdmin();

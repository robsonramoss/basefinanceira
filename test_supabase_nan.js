import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://vrmickfxoxvyljounoxq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'fake-key'; // Just to check validation
const supabase = createClient(supabaseUrl, supabaseKey);
try {
  const req = supabase.from('tutoriais').update({ duracao_seg: NaN }).eq('id', '123');
  console.log('Success, builder accepted NaN');
} catch (e) {
  console.log('Error caught:', e);
}

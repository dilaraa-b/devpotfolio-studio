import { supabase } from './supabase'

export async function testConnection() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Supabase yanıtı:', error.message)
    return
  }

  console.log('Supabase bağlantısı başarılı!', data)
}
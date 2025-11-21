import { createClient } from '@supabase/supabase-js';

// 1. Dùng đúng tên biến mà bạn ĐÃ CÓ trên Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// 2. Code cũ đòi ANON_KEY, giờ mình đổi sang dùng SERVICE_ROLE_KEY (cái bạn đang có)
// Lưu ý: Biến này chỉ hoạt động ở phía Server (API Routes), rất bảo mật.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Thiếu thông tin kết nối Supabase (URL hoặc Key) trong Vercel Settings");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
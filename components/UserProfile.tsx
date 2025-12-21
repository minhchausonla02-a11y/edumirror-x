'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
// 1. THÊM: Import usePathname để lấy đường dẫn hiện tại
import { useRouter, usePathname } from 'next/navigation'

export default function UserProfile() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  // 2. THÊM: Khởi tạo biến lấy đường dẫn
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    setUser(null)
  }

  // --- LOGIC HIỂN THỊ ---

  // TRƯỜNG HỢP 1: Chưa đăng nhập
  if (!user) {
    // 3. THÊM: Kiểm tra "thông minh"
    // Nếu đường dẫn bắt đầu bằng '/survey' (trang học sinh) 
    // HOẶC là '/login' (trang đăng nhập) -> Thì ẩn luôn, không hiện nút nữa.
    if (pathname?.startsWith('/survey') || pathname === '/login') {
      return null;
    }

    // Chỉ hiện nút Đăng nhập ở trang chủ hoặc các trang giới thiệu
    return (
      <a 
        href="/login" 
        className="fixed top-4 right-4 z-50 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-colors"
      >
        Đăng nhập ngay
      </a>
    )
  }

  // TRƯỜNG HỢP 2: Đã đăng nhập (Giáo viên)
  // Vẫn hiện thẻ tên bình thường để giáo viên biết mình đang dùng tài khoản nào
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-lg border border-gray-200">
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-500 uppercase font-bold">Giáo viên</span>
        <span className="text-sm font-bold text-blue-600">{user.email}</span>
      </div>
      <button 
        onClick={handleLogout}
        className="rounded bg-red-100 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-200"
      >
        Thoát
      </button>
    </div>
  )
}
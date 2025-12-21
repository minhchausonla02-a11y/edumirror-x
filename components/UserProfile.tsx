'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UserProfile() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Tự động kiểm tra xem ai đang đăng nhập
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh() // Tải lại trang
    setUser(null)
  }

  // Nếu chưa đăng nhập thì hiện nút Login
  if (!user) {
    return (
      <a 
        href="/login" 
        className="fixed top-4 right-4 z-50 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-blue-700"
      >
        Đăng nhập ngay
      </a>
    )
  }

  // Nếu đã đăng nhập thì hiện Email và nút Thoát
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
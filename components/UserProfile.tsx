'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function UserProfile() {
  const [user, setUser] = useState<any>(null)
  // THÊM: State để quản lý việc mở/đóng menu và Ref để bắt sự kiện click ra ngoài
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // 1. Lấy thông tin user từ Supabase
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // 2. THÊM MỚI: Xử lý đóng menu khi click ra ngoài vùng dropdown (Tiêu chuẩn UX)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    setUser(null)
    setIsOpen(false) // Đóng menu sau khi đăng xuất
  }

  // --- LOGIC HIỂN THỊ ---

  // TRƯỜNG HỢP 1: Chưa đăng nhập
  if (!user) {
    if (pathname?.startsWith('/survey') || pathname === '/login') {
      return null;
    }

    return (
      <a 
        href="/login" 
        className="fixed top-4 right-4 z-50 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-colors"
      >
        Đăng nhập ngay
      </a>
    )
  }

  // Lấy chữ cái đầu của email để làm Avatar, in hoa
  const initial = user.email ? user.email.charAt(0).toUpperCase() : "U";

  // TRƯỜNG HỢP 2: Đã đăng nhập (Giáo viên)
  return (
    <div className="fixed top-4 right-4 z-50" ref={dropdownRef}>
      {/* Nút Avatar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg border-2 border-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        title="Tài khoản của bạn"
      >
        {initial}
      </button>

      {/* Dropdown Menu (Chỉ hiện khi isOpen = true) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl bg-white shadow-xl border border-gray-100 focus:outline-none z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            {/* Header: Hiển thị Email */}
            <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
              <p className="text-[11px] text-gray-500 uppercase font-bold mb-1 tracking-wider">Giáo viên</p>
              <p className="text-sm font-bold text-blue-600 truncate" title={user.email}>
                {user.email}
              </p>
            </div>
            
            {/* Nút Đăng xuất */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 font-medium"
            >
              <span className="text-lg">🚪</span> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
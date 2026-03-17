'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function UserProfile() {
  const [user, setUser] = useState<any>(null)
  // State để quản lý việc mở/đóng menu và Ref để bắt sự kiện click ra ngoài
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

  // 2. Xử lý đóng menu khi click ra ngoài vùng dropdown (Tiêu chuẩn UX)
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
      // 🚀 Đã sửa fixed thành định vị thông thường, phong cách Nút bấm Sci-Fi
      <a 
        href="/login" 
        className="z-50 rounded-xl bg-transparent border border-[#00e5ff] px-5 py-2.5 text-sm font-bold text-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.2)] hover:bg-[#00e5ff] hover:text-[#040b16] transition-all uppercase tracking-wider whitespace-nowrap"
      >
        Đăng nhập
      </a>
    )
  }

  // Lấy chữ cái đầu của email để làm Avatar, in hoa
  const initial = user.email ? user.email.charAt(0).toUpperCase() : "U";

  // TRƯỜNG HỢP 2: Đã đăng nhập (Giáo viên)
  return (
    // 🚀 Đổi 'fixed' thành 'relative' để Avatar nằm gọn gàng bên trong Header
    <div className="relative z-50" ref={dropdownRef}>
      
      {/* Nút Avatar (Phong cách Lõi Hologram) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-11 h-11 rounded-full bg-[#12254a]/80 hover:bg-[#00e5ff]/20 text-[#00e5ff] font-extrabold transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] border border-[#00e5ff]/50 focus:outline-none focus:ring-2 focus:ring-[#00e5ff]/50 drop-shadow-[0_0_5px_#00e5ff]"
        title="Định danh Hệ thống"
      >
        {initial}
      </button>

      {/* Dropdown Menu (Chỉ hiện khi isOpen = true) - Kính mờ Viễn tưởng */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 origin-top-right rounded-xl bg-[#040b16]/90 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.15)] border border-[#00e5ff]/30 focus:outline-none z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            
            {/* Header: Hiển thị Email */}
            <div className="px-4 py-3 border-b border-[#1c3664] bg-[#091128]/80">
              <p className="text-[10px] text-[#8b9bc0] uppercase font-bold mb-1 tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse"></span>
                  Định danh Hệ thống
              </p>
              <p className="text-sm font-bold text-[#00e5ff] truncate drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" title={user.email}>
                {user.email}
              </p>
            </div>
            
            {/* Nút Đăng xuất (Cảnh báo Đỏ Neon) */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-sm text-[#ff003c] hover:bg-[#ff003c]/10 transition-colors flex items-center gap-3 font-bold uppercase tracking-wider"
            >
              <span className="text-lg drop-shadow-[0_0_5px_#ff003c]">🚪</span> NGẮT KẾT NỐI
            </button>
            
          </div>
        </div>
      )}
    </div>
  )
}
'use client'
// Import từ file client.ts chúng ta vừa tạo
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  // Gọi hàm tạo client mới
  const supabase = createClient()

  const handleSignUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // Chỉnh lại đường dẫn redirect cho chuẩn
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) alert('Lỗi: ' + error.message)
    else alert('Đăng ký thành công! Đã tạo tài khoản.')
  }

  const handleSignIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) alert('Lỗi đăng nhập: ' + error.message)
    else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-lg">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          EduMirror X
        </h2>
        <p className="text-center text-sm text-gray-600">Đăng nhập Giáo viên</p>
        
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            // 🚀 Đã thêm text-gray-900 và viền focus
            className="w-full rounded border p-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            // 🚀 Đã thêm text-gray-900 và viền focus
            className="w-full rounded border p-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={handleSignIn} disabled={loading} className="flex-1 rounded bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 transition-colors">
            {loading ? '...' : 'Đăng Nhập'}
          </button>
          <button onClick={handleSignUp} disabled={loading} className="flex-1 rounded bg-gray-200 py-3 font-bold text-gray-800 hover:bg-gray-300 transition-colors">
            Đăng Ký
          </button>
        </div>
      </div>
    </div>
  )
}
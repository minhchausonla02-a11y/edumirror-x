import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Dashboard sau tiết học</h1>
      <p className="text-sm text-neutral-600">
        Thống kê ẩn danh từ Phiếu 60 giây của học sinh. Dùng để điều chỉnh
        tốc độ, cách giảng và ví dụ minh hoạ cho tiết sau.
      </p>

      <DashboardView />
    </main>
  );
}

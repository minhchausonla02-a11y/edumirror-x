export default function Spinner({label}:{label?:string}) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-600">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      <span>{label ?? "Đang xử lý..."}</span>
    </div>
  );
}

export default function EmptyState({title,desc}:{title:string;desc:string}) {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-neutral-600">
      <div className="mx-auto mb-2 h-10 w-10 rounded-full border border-neutral-200" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-neutral-500">{desc}</p>
    </div>
  );
}

type CoreItem = {
  section_id: string;
  title: string;
  objectives: string[];
  misconceptions: string[];
};

export default function CoreCards({data}:{data:CoreItem[]}) {
  if (!data?.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((s) => (
        <div key={s.section_id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{s.section_id} — {s.title}</h3>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{s.objectives.length} mục tiêu</span>
          </div>

          <div className="mt-2">
            <p className="text-xs font-medium text-neutral-500">Mục tiêu</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {s.objectives.map((o,i)=>(<li key={i}>{o}</li>))}
            </ul>
          </div>

          <div className="mt-3">
            <p className="text-xs font-medium text-neutral-500">Sai lầm hay gặp</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-700">
              {s.misconceptions.map((m,i)=>(<li key={i}>{m}</li>))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

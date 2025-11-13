type QItem = {
  item_id: string;
  section_id: string;
  type: "core_mcq" | "misconception_truefalse" | "likert_5" | string;
  stem: string;
  options?: string[];
  answer?: any;
  scale?: string;
};

export default function QList({items}:{items:QItem[]}) {
  if (!items?.length) return null;

  const groups = items.reduce((acc:any, q) => {
    (acc[q.section_id] = acc[q.section_id] || []).push(q);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.keys(groups).map((sec) => (
        <div key={sec} className="rounded-2xl border bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">{sec}</h3>
          <ul className="space-y-3">
            {groups[sec].map((q:QItem) => (
              <li key={q.item_id} className="rounded-xl border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium">{q.stem}</p>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {q.type}
                  </span>
                </div>

                {q.type === "core_mcq" && q.options && (
                  <ol className="ml-5 list-decimal space-y-1 text-sm">
                    {q.options.map((op, i) => (
                      <li key={i}>{op}</li>
                    ))}
                  </ol>
                )}

                {q.type === "misconception_truefalse" && (
                  <p className="text-sm text-neutral-600">Đáp án: <b>{String(q.answer)}</b></p>
                )}

                {q.type === "likert_5" && (
                  <p className="text-sm text-neutral-600">Thang đo: <b>{q.scale}</b></p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

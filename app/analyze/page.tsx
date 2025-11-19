// app/page.tsx
import { Suspense } from "react";
import EduMirrorApp from "@/components/EduMirrorApp";

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading EduMirror X...</div>}>
      <EduMirrorApp />
    </Suspense>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Tải giáo án", href: "/" },
  { name: "Khảo sát", href: "/survey" },
  { name: "Dashboard", href: "/dashboard" },
  // tab này nhảy thẳng tới vùng AI trên dashboard
  { name: "Gợi ý AI", href: "/dashboard#ai" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href.startsWith("/dashboard") && pathname === "/dashboard") ||
          (tab.href === "/" && pathname === "/");

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={`px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-800 bg-[#0a0a0f] py-4 px-6">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <span>© 2024 PolyPilot Terminal</span>
          <Link href="#" className="hover:text-gray-300 transition-colors">
            Terms
          </Link>
          <Link href="#" className="hover:text-gray-300 transition-colors">
            Privacy
          </Link>
        </div>
        <div className="text-xs">
          Data provided by Polymarket • Not financial advice
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { Settings, User } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[#0a0a0f]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0f]/75">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Link href="/chatbot" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-white">PolyPilot Terminal</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </Button>
        </div>
      </div>
    </header>
  );
}

"use client";

import { ReactNode } from "react";

interface ChatShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  rightPanel?: ReactNode;
  showSidebar?: boolean;
  showRightPanel?: boolean;
}

export function ChatShell({
  sidebar,
  children,
  rightPanel,
  showSidebar = true,
  showRightPanel = false,
}: ChatShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Sidebar */}
      {showSidebar && (
        <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-border">
          {sidebar}
        </aside>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>

      {/* Right Panel */}
      {showRightPanel && rightPanel && (
        <aside className="hidden xl:flex w-80 flex-shrink-0 border-l border-border">
          {rightPanel}
        </aside>
      )}
    </div>
  );
}

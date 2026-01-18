import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PolyPilot Terminal",
  description: "Research-driven insights for Polymarket",
};

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {children}
      
      {/* Footer - visible and sticky */}
      <footer className="sticky bottom-0 w-full bg-card/80 backdrop-blur-sm border-t border-border px-4 py-2 z-10">
        <p className="text-xs text-muted-foreground text-center">
          PolyPilot provides research hypotheses and simulations only. Not financial advice. Trade at your own risk.
        </p>
      </footer>
    </div>
  );
}

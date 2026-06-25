import { AiClient } from "@/components/ai/ai-client";

export const metadata = { title: "AI Assistant" };
export const dynamic = "force-dynamic";

export default function AiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">GenAI Assistant</h2>
        <p className="text-muted-foreground">Ask questions about your shop inventory in plain English</p>
      </div>
      <AiClient />
    </div>
  );
}

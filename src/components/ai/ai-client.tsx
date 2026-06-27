"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Bot, Loader2, Lock, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { askAiAssistantAction, getAiAssistantLimitsAction } from "@/lib/actions/ai";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Which medicines are expiring soon?",
  "What medicines have expired stock?",
  "Show me recent sales summary",
  "Do I have any low stock alerts?",
  "Which medicines should I prioritize selling?",
  "List my top suppliers and active dealers",
];

function formatInlineMarkdown(text: string) {
  const nodes: Array<string | JSX.Element> = [];
  let remaining = text;

  while (remaining.length > 0) {
    const match = remaining.match(/\*\*(.+?)\*\*/);
    if (!match) {
      nodes.push(remaining);
      break;
    }

    const [fullMatch, boldText] = match;
    const index = match.index ?? 0;
    if (index > 0) {
      nodes.push(remaining.slice(0, index));
    }

    nodes.push(<strong key={`${remaining}-${index}`} className="font-semibold text-primary">{boldText}</strong>);
    remaining = remaining.slice(index + fullMatch.length);
  }

  return nodes;
}

function renderMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  const output: JSX.Element[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] | null = null;
  let tableHeader: string[] | null = null;
  let skipLine = false;

  const flushList = () => {
    if (listItems.length > 0) {
      output.push(
        <ul key={`list-${output.length}`} className="list-disc pl-6 space-y-1 text-sm text-foreground/90 my-2">
          {listItems.map((item, index) => (
            <li key={index}>{formatInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableRows && tableHeader) {
      output.push(
        <div key={`table-${output.length}`} className="overflow-x-auto my-3 rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-xs">
            <thead className="bg-muted/50">
              <tr>
                {tableHeader.map((cell, index) => (
                  <th key={index} className="px-3 py-2 text-left font-semibold text-foreground/80">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {tableRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/20">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top text-foreground/90">
                      {formatInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = null;
      tableHeader = null;
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (skipLine) {
      skipLine = false;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushTable();
      listItems.push(line.replace(/^\s*[-*]\s+/, ""));
      continue;
    }

    const tableMatch = line.split("|").map((cell) => cell.trim());
    const nextLine = lines[i + 1] ?? "";
    const isDivider = /^\s*\|?\s*[:-]+\s*(\|\s*[:-]+\s*)*\|?\s*$/.test(nextLine);

    if (line.includes("|") && isDivider) {
      flushList();
      tableHeader = tableMatch.filter((cell) => cell.length > 0);
      tableRows = [];
      skipLine = true;
      continue;
    }

    if (tableHeader && tableRows && line.includes("|")) {
      tableRows.push(line.split("|").map((cell) => cell.trim()));
      continue;
    }

    if (line.trim() === "") {
      flushList();
      flushTable();
      continue;
    }

    flushTable();
    flushList();
    output.push(
      <p key={`${line}-${i}`} className="text-sm leading-6 mb-2 last:mb-0">
        {formatInlineMarkdown(line)}
      </p>
    );
  }

  flushList();
  flushTable();
  return output;
}

export function AiClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [limits, setLimits] = useState<{ limit: number; used: number; planName: string; shopVerified: boolean } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch current AI limits & usage
  const fetchLimits = async () => {
    try {
      const res = await getAiAssistantLimitsAction();
      setLimits(res);
    } catch (err) {
      console.error("Failed to load AI limits", err);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function ask(question: string) {
    if (!question.trim() || isPending) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    startTransition(async () => {
      const result = await askAiAssistantAction(question);
      setMessages((m) => [...m, { role: "assistant", content: result.answer }]);
      // Refresh limits after a query
      await fetchLimits();
    });
  }

  if (!limits) {
    return (
      <div className="flex h-[calc(100vh-14rem)] items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Checking credentials...</p>
        </div>
      </div>
    );
  }

  const isLocked = limits.limit === 0;
  const remaining = limits.limit === Infinity ? "Unlimited" : Math.max(0, limits.limit - limits.used);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col relative overflow-hidden">
      {isLocked && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-background/50 backdrop-blur-md rounded-2xl border border-dashed border-muted-foreground/30">
          <Card className="max-w-md w-full text-center p-6 shadow-2xl border border-primary/20 bg-card/95 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold mb-2">
              {!limits.shopVerified ? "Verification Pending" : "Unlock AI Assistant"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mb-6">
              {!limits.shopVerified
                ? "AI Assistant features are locked. Once your shop is verified and approved by our central team, this feature will be fully unlocked."
                : "AI Assistant is locked on your current Starter tier. Upgrade to a Professional or Enterprise subscription plan to analyze batches, forecast stock shortages, and summarize sales metrics with Generative AI."}
            </p>
            <div className="flex flex-col gap-2">
              {limits.shopVerified ? (
                <>
                  <Button asChild className="w-full shadow-lg shadow-primary/25">
                    <Link href="/settings" className="flex items-center justify-center gap-1.5">
                      Upgrade Subscription Tier
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" asChild>
                    <Link href="/settings">View Professional / Enterprise Limits</Link>
                  </Button>
                </>
              ) : (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/50">
                  Verification usually takes 24–48 hours. Please ensure your documents are valid.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden border shadow-sm">
        <CardContent className="flex flex-1 flex-col p-0">
          {/* Header counter bar */}
          <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{limits.planName} Plan Assistant</span>
            </div>
            <div className="text-muted-foreground">
              {limits.limit === Infinity ? (
                <span className="text-emerald-600 font-semibold">Unlimited Searches</span>
              ) : (
                <span>
                  Remaining searches today:{" "}
                  <strong className={remaining === 0 ? "text-rose-600 font-bold" : "text-primary font-semibold"}>
                    {remaining} / {limits.limit}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center h-full justify-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">GenAI Pharmacy Assistant</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Ask questions about expiring medicines, stock levels, sales trends, and suppliers in plain English.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs bg-card hover:bg-muted text-foreground/80 hover:text-foreground border-muted-foreground/20"
                      onClick={() => ask(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none border"
                    }`}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 w-fit px-3 py-1.5 rounded-full border">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>Assistant is analyzing inventory...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t p-4 bg-card">
            <Textarea
              placeholder={
                isLocked
                  ? "AI assistant is locked. Please upgrade to write query."
                  : remaining === 0
                    ? "Daily queries limit reached for today."
                    : "Ask about your inventory, e.g., 'What batches are expiring in the next 30 days?'"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), ask(input))}
              rows={2}
              className="resize-none focus-visible:ring-1 text-sm rounded-xl"
              disabled={isPending || isLocked || (limits.limit !== Infinity && limits.used >= limits.limit)}
            />
            <Button
              onClick={() => ask(input)}
              disabled={isPending || !input.trim() || isLocked || (limits.limit !== Infinity && limits.used >= limits.limit)}
              className="h-auto px-4 rounded-xl shadow-md"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

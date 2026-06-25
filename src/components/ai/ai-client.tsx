"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { askAiAssistantAction } from "@/lib/actions/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Which medicines are expiring soon?",
  "What medicines have expired stock?",
  "Show me recent sales summary",
  "Which medicines should I prioritize selling?",
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

    nodes.push(<strong key={`${remaining}-${index}`}>{boldText}</strong>);
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
        <ul key={`list-${output.length}`} className="list-disc pl-6 space-y-1 text-sm">
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
        <div key={`table-${output.length}`} className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm border border-border">
            <thead className="bg-muted">
              <tr>
                {tableHeader.map((cell, index) => (
                  <th key={index} className="px-3 py-2 text-left font-semibold">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {tableRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top">
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

    if (tableHeader && line.includes("|")) {
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
      <p key={`${line}-${i}`} className="text-sm leading-6">
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function ask(question: string) {
    if (!question.trim()) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    startTransition(async () => {
      const result = await askAiAssistantAction(question);
      setMessages((m) => [...m, { role: "assistant", content: result.answer }]);
    });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <Bot className="mb-4 h-12 w-12 text-primary" />
                <h3 className="font-semibold">GenAI Pharmacy Assistant</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Ask about expiring medicines, stock levels, sales, and more — scoped to your shop data.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => ask(s)}>{s}</Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t p-4">
            <Textarea
              placeholder="Ask about your inventory..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), ask(input))}
              rows={2}
              className="resize-none"
            />
            <Button onClick={() => ask(input)} disabled={isPending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

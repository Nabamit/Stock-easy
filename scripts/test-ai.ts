import { askAiAssistantAction } from "../src/lib/actions/ai";

async function main() {
  console.log("Testing AI Assistant with 'capital of india'...");
  const result = await askAiAssistantAction("capital of india");
  console.log("Result:", result);
}

main().catch(console.error);

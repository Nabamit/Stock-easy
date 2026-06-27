import { unstable_rethrow } from "next/navigation";
console.log("unstable_rethrow type:", typeof unstable_rethrow);
try {
  // Try calling it with a normal error
  unstable_rethrow(new Error("test"));
  console.log("unstable_rethrow did not throw for standard Error - correct behavior.");
} catch (e) {
  console.error("unstable_rethrow threw standard Error - unexpected!", e);
}

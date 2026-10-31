import { execSync } from "node:child_process";

console.log("\n=========================================");
console.log("   DocDesk Production Test Suite");
console.log("=========================================\n");

try {
  console.log("Running Phase 4 service-level checks...");
  execSync("npx tsx scripts/phase4-service-checks.ts", { stdio: "inherit" });

  console.log("\nRunning Architecture Specification 9 Demo Scenarios...");
  execSync("npx tsx scripts/e2e-scenarios.ts", { stdio: "inherit" });

  console.log("\n=========================================");
  console.log("   ALL TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================\n");
} catch (error) {
  console.error("Test execution failed:", error);
  process.exit(1);
}

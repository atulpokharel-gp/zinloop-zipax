import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anyFindings,
  emptyCounts,
  reportSeverityCounts,
  worstSeverity,
} from "./report-severity.ts";

test("empty / non-object reports tally to zero", () => {
  assert.deepEqual(reportSeverityCounts(null), { high: 0, medium: 0, low: 0 });
  assert.deepEqual(reportSeverityCounts("nope"), { high: 0, medium: 0, low: 0 });
  assert.deepEqual(reportSeverityCounts({}), { high: 0, medium: 0, low: 0 });
});

test("counts server findings through importScan", () => {
  const report = {
    schemaVersion: 1,
    hostname: "lap-1",
    servers: [
      { name: "a", findings: [{ ruleId: "R1", severity: "high", title: "t" }] },
      {
        name: "b",
        findings: [
          { ruleId: "R2", severity: "medium", title: "t" },
          { ruleId: "R3", severity: "low", title: "t" },
        ],
      },
    ],
  };
  assert.deepEqual(reportSeverityCounts(report), { high: 1, medium: 1, low: 1 });
});

test("adds skill and tool findings on top of server findings", () => {
  const report = {
    schemaVersion: 1,
    hostname: "lap-1",
    servers: [{ name: "a", findings: [{ ruleId: "R1", severity: "high", title: "t" }] }],
    skills: [{ name: "s", findings: [{ severity: "high" }, { severity: "low" }] }],
    tools: [{ name: "t", server: "a", findings: [{ severity: "medium" }] }],
  };
  assert.deepEqual(reportSeverityCounts(report), { high: 2, medium: 1, low: 1 });
});

test("unsupported server block still counts skills/tools", () => {
  // schemaVersion !== 1 makes importScan throw; skills must still be tallied.
  const report = {
    schemaVersion: 2,
    skills: [{ name: "s", findings: [{ severity: "high" }] }],
  };
  assert.deepEqual(reportSeverityCounts(report), { high: 1, medium: 0, low: 0 });
});

test("ignores unknown severities", () => {
  const report = {
    schemaVersion: 1,
    hostname: "x",
    servers: [{ name: "a", findings: [{ ruleId: "R", severity: "none", title: "t" }] }],
    skills: [{ name: "s", findings: [{ severity: "bogus" }] }],
  };
  assert.deepEqual(reportSeverityCounts(report), { high: 0, medium: 0, low: 0 });
});

test("worstSeverity ranks high over medium over low over none", () => {
  assert.equal(worstSeverity({ high: 1, medium: 9, low: 9 }), "high");
  assert.equal(worstSeverity({ high: 0, medium: 2, low: 9 }), "medium");
  assert.equal(worstSeverity({ high: 0, medium: 0, low: 3 }), "low");
  assert.equal(worstSeverity(emptyCounts()), "none");
});

test("anyFindings is true only when something was found", () => {
  assert.equal(anyFindings(emptyCounts()), false);
  assert.equal(anyFindings({ high: 0, medium: 0, low: 1 }), true);
});

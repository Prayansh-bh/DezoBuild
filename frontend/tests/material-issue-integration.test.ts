import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

describe("Material Issue Live API Cutover - Phase 06/07 Cross-Domain Integration", () => {
  it("1. Material Issue mutation uses useCreateMaterialIssue", async () => {
    const fileContent = await fs.readFile(path.join(process.cwd(), "src/routes/materials/index.tsx"), "utf8");
    assert.ok(fileContent.includes("const { mutateAsync: createMaterialIssue } = useCreateMaterialIssue();"));
    assert.ok(fileContent.includes("await createMaterialIssue({"));
  });

  it("2. Payload contains wbsNodeId", async () => {
    const fileContent = await fs.readFile(path.join(process.cwd(), "src/routes/materials/index.tsx"), "utf8");
    assert.ok(fileContent.includes("wbsNodeId: act?.id || undefined"));
  });

  it("3. wbsNodeId equals the selected live WbsNode.id", async () => {
    const fileContent = await fs.readFile(path.join(process.cwd(), "src/routes/materials/index.tsx"), "utf8");
    assert.ok(fileContent.includes("const act = activeWbs.find((a) => a.id === issueActivityId) || activeWbs[0];"));
    assert.ok(fileContent.includes("wbsNodeId: act?.id || undefined"));
  });

  it("4. activityId is NOT sent to the backend", async () => {
    const fileContent = await fs.readFile(path.join(process.cwd(), "src/routes/materials/index.tsx"), "utf8");
    const startIndex = fileContent.indexOf("await createMaterialIssue({");
    const payloadBlock = fileContent.substring(startIndex, fileContent.indexOf("});", startIndex));
    assert.ok(!payloadBlock.includes("activityId:"));
  });

  it("5. mockStore.addMaterialIssue is NOT invoked by the production submit path", async () => {
    const fileContent = await fs.readFile(path.join(process.cwd(), "src/routes/materials/index.tsx"), "utf8");
    const startIndex = fileContent.indexOf("const handleIssueMaterial = async (e: React.FormEvent) => {");
    const handleIssueBlock = fileContent.substring(startIndex, fileContent.indexOf("  return (", startIndex));
    assert.ok(!handleIssueBlock.includes("mockStore.addMaterialIssue"));
  });

  it("6. successful mutation invalidates the correct query keys", async () => {
    const fileContent = await fs.readFile(path.join(process.cwd(), "src/hooks/api/useMaterials.ts"), "utf8");
    const startIndex = fileContent.indexOf("export function useCreateMaterialIssue() {");
    const hookBlock = fileContent.substring(startIndex, fileContent.indexOf("  });", startIndex));
    assert.ok(hookBlock.includes("queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });"));
  });

  it("7. API failure does not write mock/local material issue state", async () => {
    const fileContent = await fs.readFile(path.join(process.cwd(), "src/routes/materials/index.tsx"), "utf8");
    const startIndex = fileContent.indexOf("const handleIssueMaterial = async (e: React.FormEvent) => {");
    const handleIssueBlock = fileContent.substring(startIndex, fileContent.indexOf("  return (", startIndex));
    assert.ok(handleIssueBlock.includes("catch (error"));
    const catchBlock = handleIssueBlock.substring(handleIssueBlock.indexOf("catch (error"));
    assert.ok(!catchBlock.includes("mockStore"));
  });
});

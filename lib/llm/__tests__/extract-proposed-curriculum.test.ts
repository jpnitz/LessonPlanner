import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateAndNormalizeProposedCurriculum } from "../../curriculum/validate-proposed";
import { extractProposedCurriculum, extractProposedKsas } from "../client";
import { PROPOSED_KSAS_MARKER, PROPOSED_STANDARDS_MARKER } from "../markers";

describe("validateAndNormalizeProposedCurriculum", () => {
  it("accepts a valid curriculum and strips ksas", () => {
    const result = validateAndNormalizeProposedCurriculum({
      title: " Marine Biology ",
      description: " Ocean life ",
      standards: [
        {
          title: "Identify major ocean zones",
          domain_title: "Ocean Structure",
          ksas: [{ ksa_type: "knowledge", title: "ignored" }],
        },
        { title: "Compare marine food webs", domain_title: "Ecology" },
      ],
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.curriculum.title, "Marine Biology");
    assert.equal(result.curriculum.description, "Ocean life");
    assert.equal(result.curriculum.standards.length, 2);
    assert.equal(result.curriculum.standards[0]?.title, "Identify major ocean zones");
    assert.equal(
      result.curriculum.standards[0]?.domain_title,
      "Ocean Structure",
    );
    assert.equal(
      "ksas" in (result.curriculum.standards[0] ?? {}),
      false,
    );
  });

  it("rejects missing title", () => {
    const result = validateAndNormalizeProposedCurriculum({
      standards: [{ title: "Use a map" }],
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /title/i);
  });

  it("rejects empty standards after filtering invalid entries", () => {
    const result = validateAndNormalizeProposedCurriculum({
      title: "Geography",
      standards: [{ title: "   " }, { title: 123 }],
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /at least one valid standard/i);
  });
});

describe("extractProposedCurriculum", () => {
  it("extracts valid JSON after the marker", () => {
    const content = `Here is your proposed curriculum.
${PROPOSED_STANDARDS_MARKER}{"title":"Chemistry","standards":[{"title":"Balance chemical equations","domain_title":"Reactions"}]}`;

    const result = extractProposedCurriculum(content);

    assert.equal(result.parseError, null);
    assert.equal(result.proposed?.title, "Chemistry");
    assert.equal(result.proposed?.standards.length, 1);
    assert.match(result.visibleContent, /proposed curriculum/i);
  });

  it("handles markdown fences and trailing assistant text", () => {
    const content = `Summary for review.
${PROPOSED_STANDARDS_MARKER}\`\`\`json
{"title":"Algebra","standards":[{"title":"Perform arithmetic operations on polynomials","domain_title":"Polynomials"}]}
\`\`\`
Let me know if you want changes.`;

    const result = extractProposedCurriculum(content);

    assert.equal(result.parseError, null);
    assert.equal(result.proposed?.title, "Algebra");
  });

  it("returns a parse error when JSON is invalid", () => {
    const content = `Ready to save.
${PROPOSED_STANDARDS_MARKER}{"title":"Broken", standards: [`;

    const result = extractProposedCurriculum(content);

    assert.equal(result.proposed, null);
    assert.match(result.parseError ?? "", /could not be parsed/i);
  });

  it("returns a validation error when standards are missing", () => {
    const content = `${PROPOSED_STANDARDS_MARKER}{"title":"Incomplete"}`;

    const result = extractProposedCurriculum(content);

    assert.equal(result.proposed, null);
    assert.match(result.parseError ?? "", /standards array/i);
  });
});

describe("extractProposedKsas", () => {
  it("extracts KSAs with trailing assistant text", () => {
    const content = `Here are the KSAs.
${PROPOSED_KSAS_MARKER}{"ksas":[{"ksa_type":"knowledge","title":"Recall the integration-by-parts formula","description":"..."},{"ksa_type":"skill","title":"Apply integration by parts","description":"..."},{"ksa_type":"ability","title":"Choose u and dv strategically","description":"..."}]}
Let me know if you'd like more detail.`;

    const result = extractProposedKsas(content);

    assert.equal(result.ksas?.length, 3);
    assert.equal(result.ksas?.[0]?.ksa_type, "knowledge");
  });

  it("handles markdown fences and capitalized ksa_type values", () => {
    const content = `${PROPOSED_KSAS_MARKER}\`\`\`json
{"ksas":[{"ksa_type":"Knowledge","title":"K1","description":"d"},{"ksa_type":"Skill","title":"S1","description":"d"},{"ksa_type":"Ability","title":"A1","description":"d"}]}
\`\`\``;

    const result = extractProposedKsas(content);

    assert.equal(result.ksas?.length, 3);
    assert.equal(result.ksas?.[1]?.ksa_type, "skill");
  });

  it("extracts KSAs without the marker when a ksas array is present", () => {
    const content = `Here are draft KSAs:
{"ksas":[{"ksa_type":"knowledge","title":"Identify soil nutrients","description":"..."},{"ksa_type":"skill","title":"Collect soil samples","description":"..."},{"ksa_type":"ability","title":"Recommend fertilizer plans","description":"..."}]}`;

    const result = extractProposedKsas(content);

    assert.equal(result.ksas?.length, 3);
  });
});

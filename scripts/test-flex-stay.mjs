import assert from "node:assert/strict";
import { buildHumanDraft, buildRequestDraft, computeGaps, detectHumanHelpIntent } from "../src/lib/flexStay.js";

const early = computeGaps({ arrival: "10:00", checkIn: "14:00", checkOut: "11:00", departure: "" });
assert.deepEqual(early, { earlyGapMin: 240, lateGapMin: 0, hasEarlyGap: true, hasLateGap: false });

const late = computeGaps({ arrival: "", checkIn: "14:00", checkOut: "11:00", departure: "15:30" });
assert.deepEqual(late, { earlyGapMin: 0, lateGapMin: 270, hasEarlyGap: false, hasLateGap: true });

const none = computeGaps({ arrival: "15:00", checkIn: "14:00", checkOut: "11:00", departure: "09:00" });
assert.deepEqual(none, { earlyGapMin: 0, lateGapMin: 0, hasEarlyGap: false, hasLateGap: false });

const overnight = computeGaps({ arrival: "23:00", checkIn: "01:00", checkOut: "23:30", departure: "01:15" });
assert.deepEqual(overnight, { earlyGapMin: 120, lateGapMin: 105, hasEarlyGap: true, hasLateGap: true });

const invalid = computeGaps({ arrival: "25:70", checkIn: "14:00", checkOut: "11:00", departure: "15:00" });
assert.deepEqual(invalid, { earlyGapMin: 0, lateGapMin: 0, hasEarlyGap: false, hasLateGap: false });
assert.deepEqual(computeGaps({ arrival: null, checkIn: "14:00", checkOut: "11:00", departure: null }), {
  earlyGapMin: 0, lateGapMin: 0, hasEarlyGap: false, hasLateGap: false
});

const englishDraft = buildRequestDraft({ kind: "early", time: "10:30", hotelName: "Demo Hotel", language: "en" });
assert.match(englishDraft, /Demo Hotel/);
assert.match(englishDraft, /early check-in at 10:30/);
assert.match(englishDraft, /fee/);
assert.match(englishDraft, /Thank you\.$/);

const hindiDraft = buildRequestDraft({ kind: "late", time: "13:00", language: "hi" });
assert.match(hindiDraft, /13:00/);
assert.match(hindiDraft, /शुल्क/);
assert.match(hindiDraft, /धन्यवाद/);

const fallbackDraft = buildRequestDraft({ kind: "late", time: "16:00", language: "ja" });
assert.match(fallbackDraft, /late check-out until 16:00/);

assert.match(buildHumanDraft({ kind: "host", hostName: "Demo Host", experienceTitle: "Local walk", destinationCity: "Jaipur", language: "en" }), /Demo Host.*Local walk/);
assert.equal(detectHumanHelpIntent("My booking has a problem"), true);
assert.equal(detectHumanHelpIntent("Can I speak to a person?"), true);
assert.equal(detectHumanHelpIntent("मेरी बुकिंग में समस्या है"), true);
assert.equal(detectHumanHelpIntent("What is a local dish?"), false);

console.log("PASS: flexStay early gap, late gap, no gap, overnight times, invalid inputs, English/Hindi templates, fallback language, host draft and multilingual human-help intent.");

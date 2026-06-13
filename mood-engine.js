/* ═══════════════════════════════════════════════════════════════════════
 *  MOOD ENGINE
 *
 *  Pure functions that map TextAlive's analyzed signals (valence, arousal,
 *  vocal energy) onto motion parameters for the renderer.
 *
 *  Design notes:
 *   - No THREE / DOM / TextAlive imports here. Sizes are returned as *unit-free
 *     multipliers* of the caller's base CHAR_SIZE, and colour is returned as
 *     plain HSL numbers. The caller constructs THREE.Color. This keeps the file
 *     side-effect-free and unit-testable in plain Node (see the test harness).
 *   - `sampleMood` reads live values defensively: if the signals were not
 *     enabled at Player construction, or the song has not loaded yet, it returns
 *     a neutral mood instead of throwing.
 *
 *  Signal ranges (verified against textalive-app-api@0.4.0 d.ts):
 *     ValenceArousalValue = { v: number in [-1,1], a: number in [-1,1] }
 *     getVocalAmplitude(t): number in [0, getMaxVocalAmplitude()]
 * ═══════════════════════════════════════════════════════════════════════ */
"use strict";

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const lerp = (x, y, t) => x + (y - x) * t;

/**
 * Reads live mood signals from a TextAlive Player at a given time.
 * Never throws; returns neutral { valence:0, arousal:0, energy:0 } on failure.
 *
 * @param {object} player  - TextAlive Player (must be constructed with
 *                           valenceArousalEnabled / vocalAmplitudeEnabled true)
 * @param {number} timeMs
 * @returns {{valence:number, arousal:number, energy:number}}
 */
function sampleMood(player, timeMs) {
  let valence = 0;
  let arousal = 0;
  let energy = 0;

  try {
    const va = player.getValenceArousal(timeMs); // { v, a } in [-1, 1]
    if (va && Number.isFinite(va.v) && Number.isFinite(va.a)) {
      valence = clamp(va.v, -1, 1);
      arousal = clamp(va.a, -1, 1);
    }
  } catch (_) {
    /* valenceArousalEnabled false or song not loaded — stay neutral */
  }

  try {
    const amp = player.getVocalAmplitude(timeMs);
    const max = player.getMaxVocalAmplitude();
    if (Number.isFinite(amp) && Number.isFinite(max) && max > 0) {
      energy = clamp(amp / max, 0, 1);
    }
  } catch (_) {
    /* vocalAmplitudeEnabled false or song not loaded — stay neutral */
  }

  return { valence, arousal, energy };
}

/**
 * Maps a mood sample onto renderer motion parameters.
 *
 * Master dials:
 *   arousal -> intensity (spring stiffness, scale, fade speed, shake, font weight)
 *   valence -> hue temperature (cool/sad <-> warm/bright)
 *   energy  -> gates beat-synced camera shake so quiet passages stay still
 *
 * @param {{valence:number, arousal:number, energy:number}} mood
 * @returns {{
 *   stiffness:number, damping:number, sizeMul:number, trackMul:number,
 *   fadeRate:number, shake:number, spawnYMul:number, font:('serif'|'sans'),
 *   hsl:{h:number, s:number, l:number}
 * }}
 */
function moodToMotion(mood) {
  const arousal = clamp(mood.arousal, -1, 1);
  const valence = clamp(mood.valence, -1, 1);
  const energy = clamp(mood.energy, 0, 1);

  const a = (arousal + 1) / 2; // 0 = calm/ambient ... 1 = hype/energetic
  const warm = (valence + 1) / 2; // 0 = cool/sad ... 1 = warm/bright

  return {
    // Under-damped spring. Hype = stiff + low damping => sharp, hard-hitting
    // slide-ins. Calm = soft + high damping => slow flowing settle.
    stiffness: lerp(0.03, 0.16, a),
    damping: lerp(0.86, 0.58, a),

    // Multiplier of CHAR_SIZE. Hype scales typography up aggressively.
    sizeMul: lerp(1.0, 1.7, a),

    // Tracking (letter-spacing) as a multiplier of CHAR_SIZE.
    // Ambient/calm breathes wide; hype packs tight, grid-like.
    trackMul: lerp(0.22, 0.04, a),

    // Exit alpha decay per frame. Melancholy = slow lingering fade;
    // hype = near hard cut.
    fadeRate: lerp(0.012, 0.06, a),

    // Beat-synced camera-shake amplitude (world units), gated by vocal energy.
    shake: a * energy * 0.18,

    // Spawn offset as a multiplier of CHAR_SIZE: gentle drift-up (calm) vs.
    // slam-from-far-below (hype).
    spawnYMul: lerp(-1.8, -4.2, a),

    // Typeface selector for the serif <-> bold-sans contrast (feature #1).
    font: a > 0.62 ? "sans" : "serif",

    // Near-monochrome "ink" tuned for a white background. Valence drives hue
    // temperature; arousal drives weight (darker reads bolder on white).
    hsl: {
      h: lerp(220, 28, warm) / 360, // cool blue -> warm grey
      s: lerp(0.05, 0.2, a), // a touch more saturation when intense
      l: lerp(0.18, 0.09, a), // intense reads darker/bolder
    },
  };
}

export { sampleMood, moodToMotion };
export default { sampleMood, moodToMotion, _internal: { clamp, lerp } };

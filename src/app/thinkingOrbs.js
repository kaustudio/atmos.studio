/* THE AGENT'S ORB — TWELVE POINTS, FOUR BEHAVIOURS (18.09.26, by request).

   WHY IT IS NOT THE REFERENCE ANY MORE. The orb beside the status line was Jakub Antalik's Thinking
   Orbs adopted 1:1 (17.09.26). The ask the next day was "less circles, or in some way adjust it — I
   don't want it to be 1:1 to the original reference". Four variants were recorded side by side at
   20px and at 4x, in both themes: the reference thinned, thinned in the page's ink, a ring of dots
   echoing the smoke ring, and this. This one was picked.

   WHAT CHANGED FROM THE REFERENCE. The Thinking Orbs build each state as a different construction
   (a globe, orbits, a cube, a ribbon) out of forty to sixty dots at 20px, which beside a line of
   type reads as a texture. Here there is one body for all four steps of the reading: the twelve
   corners of an icosahedron — the fewest points that still read as a sphere when they turn — in the
   page's ink (`--on-surface`), depth carried by opacity and size only. It keeps its identity from
   step to step and changes only what it does:

     searching  (Reading light)          a light crosses it left to right, the way a line is read:
                                         the points it reaches come up to full ink and fade behind
                                         it, then the body rests before the next pass.
     working    (Sampling the field)     one point at a time, in no order, comes forward — it swells
                                         to full ink and settles back, as if picked up and put down.
     solving    (Grouping the colours)   the turn slows almost to a hold, and the points run over the
                                         surface into one mark per swatch, set on the points facing
                                         the reader; each mark's AREA is its swatch's share
                                         (`data-orb-groups`), so the body shows the palette in
                                         proportion for as long as the step lasts.
     composing  (Naming the mood)        the marks let go, smallest first, back into the sphere, which
                                         breathes as one body on DUR.breathe for as long as the name
                                         takes.

   CONTINUITY. The app starts it once per reading and changes `data-orb-state` and `data-orb-groups`
   in place (AppView ThinkingOrb); the observer below picks both up and eases out of the current pose,
   so the twelve points stay one object from the first step to the last. A re-init on the same canvas
   continues too: on destroy an instance leaves its last pose on the canvas (`__thinkingOrbCarry`) and
   the next one eases out of it, with the turn carrying on from the same angle.

   COLOUR. One ink, read from the canvas. Points of the same opacity are filled as one path, and with
   one colour the painting order does not matter, so where points meet — a mark forming — they read
   as one shape, never as a darker seam.

   The instance lifecycle below (scope scanning, the rAF loop, offscreen and hidden-tab pauses, theme
   observers, DPR sizing, re-init cleanup) is adapted from the reference, whose MIT notice travels
   with it. The module cannot reach the app's instance, so its EASE and DUR below are local copies of
   motion.js's figures (EASE.standard, and DUR overlay 0.8, reveal 0.62, breathe 2.6); change them
   together. */

/*
MIT License

Copyright (c) 2026 Jakub Antalik

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Vanilla JavaScript adaptation of Thinking Orbs:
https://github.com/Jakubantalik/thinking-orbs
*/

/* ONE FRAME LOOP FOR THE WHOLE MODULE. Every call registers a step; a single requestAnimationFrame
   runs them all and stops when none of them has anything to draw. */
const ticker = { steps: new Set(), frame: 0 };
const tick = (now) => {
	ticker.frame = 0;
	let again = false;
	ticker.steps.forEach((step) => {
		if (step(now)) again = true;
	});
	if (again && !ticker.frame) ticker.frame = requestAnimationFrame(tick);
};
const wake = () => {
	if (!ticker.frame) ticker.frame = requestAnimationFrame(tick);
};

/* The site's curves (motion.js EASE), solved for x by bisection: a handful of calls per frame. */
const cubicBezier = (x1, y1, x2, y2) => {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	return (x) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let lo = 0;
		let hi = 1;
		let t = x;
		for (let i = 0; i < 22; i += 1) {
			const value = ((ax * t + bx) * t + cx) * t;
			if (Math.abs(value - x) < 1e-5) break;
			if (value < x) lo = t;
			else hi = t;
			t = (lo + hi) / 2;
		}
		return ((ay * t + by) * t + cy) * t;
	};
};
const EASE = {
	standard: cubicBezier(0.22, 1, 0.36, 1),
};
// motion.js DUR, the ones used here
const DUR = { reveal: 0.62, overlay: 0.8, breathe: 2.6 };

export function thinkingOrbs(scope = document, options = {}) {
	const config = {
		state: "working",
		size: 64,
		speed: 1,
		theme: "auto",
		paused: false,
		...options,
	};

	const labels = {
		searching: "Searching…",
		working: "Working…",
		solving: "Solving…",
		composing: "Composing…",
		listening: "Listening…",
		shaping: "Shaping…",
	};
	// The reference's two other states borrow the nearest behaviour, so no caller breaks.
	const behaviourOf = {
		searching: "searching",
		working: "working",
		solving: "solving",
		composing: "composing",
		listening: "composing",
		shaping: "solving",
	};

	/* THE BODY. */
	const N = 12;
	const TILT = 0.44; // the axis leans toward the reader, so the turn reads as a turn
	const SPIN = 0.5; // radians per second, while it reads, samples and names
	// While it groups, the body all but holds still, so the palette stays up to the reader for as
	// long as the step lasts; the turn slows into it and picks up out of it (SPIN_EASE, s).
	const SPIN_OF = { searching: SPIN, working: SPIN, solving: 0.08, composing: SPIN };
	const SPIN_EASE = 0.45;
	const RADIUS = 0.315; // sphere radius, as a share of the canvas
	const CARRY_MS = 1500; // how old a carried pose may be and still be continued
	const DEFAULT_GROUPS = [0.38, 0.25, 0.17, 0.12, 0.08];
	const MAX_MARKS = 6; // past six, the smallest swatches share one mark
	// how long a new state takes to ease out of the pose it inherited
	const TRANSITION = { searching: DUR.overlay, working: 0.7, solving: 0.35, composing: 1.2 };
	// On the way out of the marks, size and ink lead the travel: a mark gives back its points'
	// size before they part, the reverse of the gathering, so the parting is never a heap of discs.
	const LEAD = { searching: 1, working: 1, solving: 1, composing: 2 };

	const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
	const mix = (from, to, progress) => from + (to - from) * progress;
	const easeInOutSine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
	const easeOutCubic = (x) => 1 - (1 - x) ** 3;
	const smoothStep = (edge0, edge1, x) => {
		const t = clamp((x - edge0) / (edge1 - edge0));
		return t * t * (3 - 2 * t);
	};
	const readNumber = (value, fallback) => {
		const number = Number.parseFloat(value);
		return Number.isFinite(number) ? number : fallback;
	};
	const readBoolean = (value, fallback) => {
		if (value === undefined) return fallback;
		return value !== "false";
	};
	const hash = (a, b) => {
		const value = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
		return value - Math.floor(value);
	};

	// The icosahedron, a five-fold axis upright: two poles and two staggered rings of five.
	const HOME = [[0, 1, 0]];
	for (let k = 0; k < 5; k += 1) {
		const a = (2 * Math.PI * k) / 5;
		HOME.push([(2 / Math.sqrt(5)) * Math.cos(a), 1 / Math.sqrt(5), (2 / Math.sqrt(5)) * Math.sin(a)]);
	}
	for (let k = 0; k < 5; k += 1) {
		const a = (2 * Math.PI * k) / 5 + Math.PI / 5;
		HOME.push([(2 / Math.sqrt(5)) * Math.cos(a), -1 / Math.sqrt(5), (2 / Math.sqrt(5)) * Math.sin(a)]);
	}
	HOME.push([0, -1, 0]);
	// tipped off that axis, so the turn never lines the points up into a ring round a centre
	HOME.forEach((h) => {
		const ax = 0.62;
		const az = 0.38;
		const y1 = h[1] * Math.cos(ax) - h[2] * Math.sin(ax);
		const z1 = h[1] * Math.sin(ax) + h[2] * Math.cos(ax);
		const x2 = h[0] * Math.cos(az) - y1 * Math.sin(az);
		const y2 = h[0] * Math.sin(az) + y1 * Math.cos(az);
		h[0] = x2;
		h[1] = y2;
		h[2] = z1;
	});

	// sphere space -> view space (the turn about the upright axis, then the tilt); y up, z to the reader
	const toView = (h, yaw, out) => {
		const cy = Math.cos(yaw);
		const sy = Math.sin(yaw);
		const ct = Math.cos(TILT);
		const st = Math.sin(TILT);
		const rx = h[0] * cy + h[2] * sy;
		const rz = -h[0] * sy + h[2] * cy;
		out[0] = rx;
		out[1] = h[1] * ct - rz * st;
		out[2] = h[1] * st + rz * ct;
		return out;
	};
	// depth: the near side larger and in full ink, the far side small and faint (px at a 20px canvas)
	const depthRadius = (z) => 1 + 0.62 * ((z + 1) / 2);
	const depthInk = (z) => 0.24 + 0.76 * ((z + 1) / 2) ** 1.4;

	// Spherical interpolation of two points, lengths interpolated alongside, so a point travels over
	// the surface instead of through the middle of the body.
	const blendInto = (out, o, ax, ay, az, bx, by, bz, t) => {
		const la = Math.hypot(ax, ay, az) || 1;
		const lb = Math.hypot(bx, by, bz) || 1;
		ax /= la; ay /= la; az /= la;
		bx /= lb; by /= lb; bz /= lb;
		const d = clamp(ax * bx + ay * by + az * bz, -1, 1);
		const theta = Math.acos(d);
		let wa = 1 - t;
		let wb = t;
		if (theta > 1e-4 && theta < Math.PI - 1e-3) {
			const s = Math.sin(theta);
			wa = Math.sin((1 - t) * theta) / s;
			wb = Math.sin(t * theta) / s;
		}
		const x = ax * wa + bx * wb;
		const y = ay * wa + by * wb;
		const z = az * wa + bz * wb;
		const l = Math.hypot(x, y, z) || 1;
		const length = mix(la, lb, t);
		out[o] = (x / l) * length;
		out[o + 1] = (y / l) * length;
		out[o + 2] = (z / l) * length;
	};

	const parseGroups = (value) => {
		if (!value) return DEFAULT_GROUPS;
		let weights = String(value)
			.split(/[\s,]+/)
			.map(Number.parseFloat)
			.filter((w) => Number.isFinite(w) && w > 0)
			.sort((a, b) => b - a);
		if (weights.length > MAX_MARKS) {
			const rest = weights.slice(MAX_MARKS - 1).reduce((sum, w) => sum + w, 0);
			weights = [...weights.slice(0, MAX_MARKS - 1), rest].sort((a, b) => b - a);
		}
		return weights.length ? weights : DEFAULT_GROUPS;
	};

	/* THE MARKS. The palette is shown on the body itself. As many of the twelve points as there are
	   weights (at most six) become marks — the ones facing the reader when the gathering lands, the
	   heaviest on the nearest — and every other point runs over the surface into the mark nearest it,
	   each mark taking a share of the points by its weight. A mark's AREA is its weight's share, so
	   the marks side by side are the palette in proportion. They stay on the body and turn with it. */
	const MARK_SCALE = 3.7; // px at a 20px canvas: the radius a palette of one colour would have
	const MARK_MAX = 3;
	const MARK_MIN = 0.9;
	const LAND = 0.85; // how long one mark takes to gather (s)
	const markRadius = (share, z) =>
		clamp(MARK_SCALE * Math.sqrt(share), MARK_MIN, MARK_MAX) * (0.66 + 0.34 * ((z + 1) / 2));
	const markInk = (z) => 0.28 + 0.72 * ((z + 1) / 2) ** 1.2;

	// Points per mark, by share (largest remainder, at least one each).
	const countsFor = (weights) => {
		const K = weights.length;
		const total = weights.reduce((sum, w) => sum + w, 0);
		const shares = weights.map((w) => (w / total) * N);
		const counts = shares.map((s) => Math.max(1, Math.floor(s)));
		let assigned = counts.reduce((sum, c) => sum + c, 0);
		const byRemainder = shares
			.map((s, k) => [s - Math.floor(s), k])
			.sort((a, b) => b[0] - a[0]);
		for (let r = 0; assigned < N; r += 1, assigned += 1) counts[byRemainder[r % K][1]] += 1;
		for (let k = K - 1; assigned > N; k = (k + K - 1) % K) {
			if (counts[k] > 1) {
				counts[k] -= 1;
				assigned -= 1;
			}
		}
		return counts;
	};

	// Which points become marks, and which mark every other point runs into: nearest pairs first
	// over the sphere, so the gathering is short travel.
	const makeGroups = (instance, weights) => {
		const total = weights.reduce((sum, w) => sum + w, 0);
		const shares = weights.map((w) => w / total);
		const counts = countsFor(weights);
		const K = weights.length;
		const at = [0, 0, 0];
		// where the turn will have carried the body once the gathering has landed
		const landing = instance.yaw + instance.spin * SPIN_EASE + SPIN_OF.solving * LAND;
		const site = HOME.map((h, i) => [toView(h, landing, at)[2], i])
			.sort((p, q) => q[0] - p[0])
			.slice(0, K)
			.map(([, i]) => i);
		const markOf = new Int8Array(N).fill(-1);
		const filled = new Array(K).fill(1);
		site.forEach((i, k) => {
			markOf[i] = k;
		});
		const pairs = [];
		for (let i = 0; i < N; i += 1) {
			if (markOf[i] >= 0) continue;
			site.forEach((s, k) => {
				const h = HOME[i];
				const m = HOME[s];
				pairs.push([h[0] * m[0] + h[1] * m[1] + h[2] * m[2], i, k]);
			});
		}
		pairs.sort((p, q) => q[0] - p[0]);
		pairs.forEach(([, i, k]) => {
			if (markOf[i] >= 0 || filled[k] >= counts[k]) return;
			markOf[i] = k;
			filled[k] += 1;
		});
		instance.groups = { site, shares, markOf };
	};

	/* THE FOUR BEHAVIOURS. Each writes, for every point, a position in view space (sphere radius 1,
	   y up, z toward the reader), a radius (px at a 20px canvas) and an ink (0–1). */
	const view = [0, 0, 0];
	const setPoint = (instance, i, v, radius, ink) => {
		instance.tp[i * 3] = v[0];
		instance.tp[i * 3 + 1] = v[1];
		instance.tp[i * 3 + 2] = v[2];
		instance.tr[i] = radius;
		instance.ta[i] = ink;
	};

	const reading = (instance, t) => {
		// A pass every 1.75s: the light crosses in 1.35s, what it has reached stays lit behind it and
		// fades, so the lit side grows from the left like a line being read; then a short rest. The
		// light reaches the far side too, so the pass is seen arriving at the left edge and leaving
		// at the right, not only where it crosses the middle.
		const period = 1.75;
		const sweep = 1.35;
		const phase = instance.still ? 0.8 : t % period;
		const front = -1.25 + (2.5 * phase) / sweep;
		const rest = smoothStep(period, period - 0.4, phase);
		for (let i = 0; i < N; i += 1) {
			toView(HOME[i], instance.yaw, view);
			const passed = front - view[0];
			const lit = rest * smoothStep(-0.2, 0.08, passed) * Math.exp(-Math.max(0, passed) / 0.95);
			const ink = depthInk(view[2]);
			setPoint(
				instance,
				i,
				view,
				depthRadius(view[2]) * (1 + 0.24 * lit),
				mix(ink * 0.56, Math.max(ink, 0.7), lit),
			);
		}
	};

	const LIFT = 1.2;
	const liftAmount = (p) => {
		if (p <= 0 || p >= 1) return 0;
		if (p < 0.3) return easeOutCubic(p / 0.3);
		if (p < 0.42) return 1;
		return 1 - easeInOutSine((p - 0.42) / 0.58);
	};
	const sampling = (instance, t) => {
		const { liftStart } = instance;
		if (instance.still) {
			liftStart.fill(-9);
			let pick = -1;
			let bestZ = -2;
			for (let i = 0; i < N; i += 1) {
				toView(HOME[i], instance.yaw, view);
				if (view[2] < 0.75 && view[2] > bestZ && Math.abs(view[0]) > 0.3) {
					bestZ = view[2];
					pick = i;
				}
			}
			if (pick >= 0) liftStart[pick] = t - LIFT * 0.36;
		} else if (t >= instance.nextLift) {
			// one at a time, on the near side, never the same point twice running or its neighbour
			const candidates = [];
			for (let i = 0; i < N; i += 1) {
				if (t - liftStart[i] < LIFT + 0.3) continue;
				toView(HOME[i], instance.yaw + instance.spin * 0.3, view);
				if (view[2] < -0.05) continue;
				if (instance.lastLift >= 0) {
					const h = HOME[instance.lastLift];
					if (h[0] * HOME[i][0] + h[1] * HOME[i][1] + h[2] * HOME[i][2] > 0.4) continue;
				}
				candidates.push(i);
			}
			if (candidates.length) {
				const pick = candidates[Math.floor(hash(instance.liftCount, 7.31) * candidates.length)];
				liftStart[pick] = t;
				instance.lastLift = pick;
			}
			instance.liftCount += 1;
			instance.nextLift = t + 0.46 + 0.16 * hash(instance.liftCount, 3.17);
		}
		for (let i = 0; i < N; i += 1) {
			toView(HOME[i], instance.yaw, view);
			const l = liftAmount((t - liftStart[i]) / LIFT);
			const ink = depthInk(view[2]);
			const radius = depthRadius(view[2]);
			const out = 1 + 0.2 * l;
			view[0] *= out;
			view[1] *= out;
			view[2] *= out;
			setPoint(instance, i, view, radius * (1 + 0.42 * l), mix(ink * 0.6, 1, l));
		}
	};

	const markAt = [0, 0, 0];
	const grouping = (instance, t) => {
		const { tp } = instance;
		const { site, shares, markOf } = instance.groups;
		const time = instance.still ? 4 : t;
		for (let i = 0; i < N; i += 1) {
			const k = markOf[i];
			toView(HOME[i], instance.yaw, view);
			toView(HOME[site[k]], instance.yaw, markAt);
			// the heaviest first, the rest a beat apart
			const g = easeInOutSine(clamp((time - 0.06 * k) / LAND));
			blendInto(tp, i * 3, view[0], view[1], view[2], markAt[0], markAt[1], markAt[2], g);
			// a point keeps its own size while it travels and takes the mark's once it has arrived
			instance.tr[i] = mix(depthRadius(view[2]), markRadius(shares[k], markAt[2]), smoothStep(0.45, 1, g));
			// ink leads, so points already meeting are one shape of one ink
			instance.ta[i] = mix(depthInk(view[2]) * 0.6, markInk(markAt[2]), smoothStep(0, 0.55, g));
		}
	};

	const naming = (instance, t) => {
		const time = instance.still ? DUR.breathe / 2 : t;
		const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * time) / DUR.breathe);
		const scale = 0.86 + 0.14 * breath;
		for (let i = 0; i < N; i += 1) {
			toView(HOME[i], instance.yaw, view);
			const ink = depthInk(view[2]);
			const radius = depthRadius(view[2]);
			view[0] *= scale;
			view[1] *= scale;
			view[2] *= scale;
			setPoint(instance, i, view, radius * (0.94 + 0.1 * breath), ink * (0.62 + 0.38 * breath));
		}
	};

	const behaviours = {
		searching: reading,
		working: sampling,
		solving: grouping,
		composing: naming,
	};

	/* ONE FRAME: advance the chosen behaviour, ease out of any inherited pose, then paint. */
	const compute = (instance) => {
		const { cp, cr, ca, tp, tr, ta } = instance;
		const t = instance.t;
		behaviours[instance.behaviour](instance, t);
		const from = instance.still ? null : instance.from;
		let settled = true;
		for (let i = 0; i < N; i += 1) {
			const o = i * 3;
			const p = from ? clamp((t - instance.fromT - instance.fromDelay[i]) / instance.transition) : 1;
			if (p < 1) {
				settled = false;
				const e = easeInOutSine(p);
				const lead = easeInOutSine(clamp(p * instance.lead));
				blendInto(cp, o, from.pos[o], from.pos[o + 1], from.pos[o + 2], tp[o], tp[o + 1], tp[o + 2], e);
				cr[i] = mix(from.r[i], tr[i], lead);
				ca[i] = mix(from.a[i], ta[i], lead);
			} else {
				cp[o] = tp[o];
				cp[o + 1] = tp[o + 1];
				cp[o + 2] = tp[o + 2];
				cr[i] = tr[i];
				ca[i] = ta[i];
			}
		}
		if (from && settled) instance.from = null;
		instance.fade = instance.still
			? 1
			: mix(instance.fadeFrom, 1, EASE.standard(clamp(t / DUR.reveal)));
		instance.drawn = true;
	};

	const paint = (instance) => {
		const { context, size, devicePixelRatio, cp, cr, ca, px, py, pr, pa, order } = instance;
		context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
		context.clearRect(0, 0, size, size);
		const centre = size / 2;
		const radius = size * RADIUS;
		const dotScale = (size / 20) ** 0.8;
		const fade = instance.fade;
		const grow = 0.8 + 0.2 * fade;
		for (let i = 0; i < N; i += 1) {
			const o = i * 3;
			let x = cp[o] * radius * grow;
			let y = -cp[o + 1] * radius * grow;
			const r = Math.max(0.35, cr[i] * dotScale);
			// nothing leaves the canvas: a point near the edge is held just inside it
			const room = centre - r - 0.35 * dotScale;
			const reach = Math.hypot(x, y);
			if (reach > room && reach > 0) {
				x *= room / reach;
				y *= room / reach;
			}
			px[i] = centre + x;
			py[i] = centre + y;
			pr[i] = r;
			// quantised, so points of one ink can share a path
			pa[i] = Math.round(clamp(ca[i] * fade) * 32) / 32;
		}
		order.sort((a, b) => pa[a] - pa[b]);
		context.fillStyle = instance.ink;
		let k = 0;
		while (k < N) {
			const alpha = pa[order[k]];
			if (alpha < 0.02) {
				k += 1;
				continue;
			}
			context.globalAlpha = alpha;
			context.beginPath();
			while (k < N && pa[order[k]] === alpha) {
				const i = order[k];
				context.moveTo(px[i] + pr[i], py[i]);
				context.arc(px[i], py[i], pr[i], 0, Math.PI * 2);
				k += 1;
			}
			context.fill();
		}
		context.globalAlpha = 1;
	};

	/* LIFECYCLE (adapted from the reference). */
	const selector = "[data-thinking-orb]";
	const canvases = [];
	if (scope instanceof Element && scope.matches(selector)) canvases.push(scope);
	if (scope.querySelectorAll) canvases.push(...scope.querySelectorAll(selector));
	if (!canvases.length) return () => {};

	const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
	const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	let reducedMotion = reducedMotionQuery.matches;
	let sharedListenersRemoved = false;
	let intersectionObserver;
	let attributeObserver;
	const instances = [];

	const getAncestorTheme = (element) => {
		let currentElement = element;
		while (currentElement) {
			const theme = currentElement.getAttribute("data-theme");
			if (theme === "dark") return true;
			if (theme === "light") return false;
			if (currentElement.classList.contains("dark")) return true;
			if (currentElement.classList.contains("light")) return false;
			currentElement = currentElement.parentElement;
		}
		return null;
	};

	// The ink is the page's `--on-surface`, as the canvas itself resolves it (the context normalises
	// whatever colour syntax it is written in). A canvas forced to the other theme than its page's,
	// or a page without the property, takes that theme's ink instead.
	const resolveInk = (instance) => {
		const { context, canvas } = instance;
		const pageDark = getAncestorTheme(canvas) ?? systemThemeQuery.matches;
		instance.dark = instance.theme === "auto" ? pageDark : instance.theme === "dark";
		const fallback = instance.dark ? "#f3f3ef" : "#1a1a1a";
		context.fillStyle = fallback;
		const value = getComputedStyle(canvas).getPropertyValue("--on-surface").trim();
		if (value && instance.dark === pageDark) context.fillStyle = value;
		instance.ink = context.fillStyle;
	};

	const canAnimate = (instance) =>
		!instance.destroyed &&
		!instance.paused &&
		instance.speed > 0 &&
		instance.visible &&
		!reducedMotion &&
		document.visibilityState !== "hidden";

	const drawStill = (instance) => {
		instance.still = true;
		compute(instance);
		paint(instance);
		instance.still = false;
	};

	// Repaint what is there if there is anything, otherwise the state's still.
	const redraw = (instance) => {
		if (instance.drawn && !reducedMotion) paint(instance);
		else drawStill(instance);
	};

	const step = (now) => {
		let needsAnotherFrame = false;
		instances.forEach((instance) => {
			if (!canAnimate(instance)) {
				instance.last = now;
				return;
			}
			const dt = clamp((now - instance.last) / 1000, 0, 0.05) * instance.speed;
			instance.last = now;
			instance.t += dt;
			instance.spin += (SPIN_OF[instance.behaviour] - instance.spin) * (1 - Math.exp(-dt / SPIN_EASE));
			instance.yaw += dt * instance.spin;
			compute(instance);
			paint(instance);
			needsAnotherFrame = true;
		});
		return needsAnotherFrame;
	};

	const requestRender = () => {
		if (sharedListenersRemoved || !instances.some(canAnimate)) return;
		wake();
	};

	const snapshot = (instance) => ({
		pos: Float64Array.from(instance.cp),
		r: Float64Array.from(instance.cr),
		a: Float64Array.from(instance.ca),
		fade: instance.fade,
		spin: instance.spin,
		yaw: instance.yaw,
		at: performance.now(),
		n: N,
	});

	// Start (or restart) a behaviour; `from` is the pose it eases out of, if any.
	const begin = (instance, state, from) => {
		instance.state = state;
		instance.behaviour = behaviourOf[state];
		instance.t = 0;
		instance.from = from;
		instance.fromT = 0;
		instance.fromDelay.fill(0);
		instance.transition = TRANSITION[instance.behaviour];
		instance.lead = LEAD[instance.behaviour];
		instance.liftStart.fill(-9);
		instance.nextLift = 0.12;
		instance.liftCount = 0;
		instance.lastLift = -1;
		instance.groups = null;
		const weights = parseGroups(instance.canvas.dataset.orbGroups);
		if (instance.behaviour === "solving") makeGroups(instance, weights);
		if (instance.behaviour === "composing") {
			if (!from) {
				// Arriving with nothing to continue (never in the app, where the grouping always comes
				// first): start from the marks, so what is seen is still the letting go.
				makeGroups(instance, weights);
				const { site, shares, markOf } = instance.groups;
				const pos = new Float64Array(N * 3);
				const r = new Float64Array(N);
				const a = new Float64Array(N);
				for (let i = 0; i < N; i += 1) {
					const k = markOf[i];
					toView(HOME[site[k]], instance.yaw, markAt);
					pos.set(markAt, i * 3);
					r[i] = markRadius(shares[k], markAt[2]);
					a[i] = markInk(markAt[2]);
				}
				instance.from = { pos, r, a };
				instance.groups = null;
			}
			// the smallest marks let go first, the heaviest last
			const order = Array.from({ length: N }, (_, i) => i).sort(
				(p, q) => instance.from.r[p] - instance.from.r[q],
			);
			let rank = 0;
			order.forEach((i, index) => {
				if (index > 0 && instance.from.r[i] - instance.from.r[order[index - 1]] > 0.05) rank += 1;
				instance.fromDelay[i] = Math.min(0.24, 0.06 * rank);
			});
		}
	};

	const switchState = (instance, requested) => {
		const state = Object.hasOwn(labels, requested) ? requested : "working";
		if (state === instance.state) return;
		instance.fadeFrom = instance.fade; // an arrival already under way carries on, not over
		begin(instance, state, instance.drawn && !reducedMotion ? snapshot(instance) : null);
		if (instance.ownsLabel) instance.canvas.setAttribute("aria-label", labels[state]);
		if (!canAnimate(instance)) drawStill(instance);
		requestRender();
	};

	const regroup = (instance) => {
		if (instance.behaviour !== "solving") return;
		const from = instance.drawn && !reducedMotion ? snapshot(instance) : null;
		makeGroups(instance, parseGroups(instance.canvas.dataset.orbGroups));
		instance.from = from;
		instance.fromT = instance.t;
		instance.fromDelay.fill(0);
		instance.transition = DUR.overlay;
		instance.lead = 1;
		if (!canAnimate(instance)) drawStill(instance);
		requestRender();
	};

	const readSize = (canvas) =>
		Math.max(8, readNumber(canvas.dataset.orbSize, readNumber(config.size, 64)));
	const applySize = (instance) => {
		const { canvas } = instance;
		canvas.width = Math.round(instance.size * instance.devicePixelRatio);
		canvas.height = Math.round(instance.size * instance.devicePixelRatio);
		canvas.style.width = `${instance.size}px`;
		canvas.style.height = `${instance.size}px`;
	};
	const readTheme = (canvas) => {
		const requestedTheme = canvas.dataset.orbTheme ?? config.theme;
		return ["auto", "dark", "light"].includes(requestedTheme) ? requestedTheme : "auto";
	};

	// The attributes the reference only read once are followed here, so a framework can change them
	// in place without a re-init.
	const updateAttribute = (instance, name) => {
		const { canvas } = instance;
		if (name === "data-orb-state") switchState(instance, canvas.dataset.orbState ?? config.state);
		else if (name === "data-orb-groups") regroup(instance);
		else if (name === "data-orb-paused") {
			instance.paused = readBoolean(canvas.dataset.orbPaused, config.paused);
			if (!instance.drawn) drawStill(instance);
			requestRender();
		} else if (name === "data-orb-speed") {
			instance.speed = Math.max(0, readNumber(canvas.dataset.orbSpeed, readNumber(config.speed, 1)));
			requestRender();
		} else if (name === "data-orb-size") {
			const size = readSize(canvas);
			if (size === instance.size) return;
			instance.size = size;
			applySize(instance);
			resolveInk(instance);
			redraw(instance);
		} else if (name === "data-orb-theme") {
			instance.theme = readTheme(canvas);
			resolveInk(instance);
			redraw(instance);
		}
	};

	const removeSharedListeners = () => {
		if (sharedListenersRemoved) return;
		sharedListenersRemoved = true;
		ticker.steps.delete(step);
		intersectionObserver?.disconnect();
		attributeObserver?.disconnect();
		document.removeEventListener("visibilitychange", requestRender);
		systemThemeQuery.removeEventListener("change", refreshThemes);
		reducedMotionQuery.removeEventListener("change", updateReducedMotion);
	};

	const removeSharedListenersWhenEmpty = () => {
		if (instances.every((instance) => instance.destroyed)) removeSharedListeners();
	};

	const refreshThemes = () => {
		instances.forEach((instance) => {
			if (instance.destroyed) return;
			const ink = instance.ink;
			resolveInk(instance);
			if (instance.ink !== ink || !instance.drawn) redraw(instance);
		});
		requestRender();
	};

	const updateReducedMotion = () => {
		reducedMotion = reducedMotionQuery.matches;
		if (reducedMotion) {
			instances.forEach((instance) => {
				if (!instance.destroyed) drawStill(instance);
			});
			return;
		}
		requestRender();
	};

	intersectionObserver =
		typeof IntersectionObserver === "undefined"
			? null
			: new IntersectionObserver((entries) => {
					entries.forEach((entry) => {
						const instance = instances.find(
							(candidate) => candidate.canvas === entry.target && !candidate.destroyed,
						);
						if (instance) instance.visible = entry.isIntersecting;
					});
					requestRender();
				});

	canvases.forEach((canvas) => {
		if (!(canvas instanceof HTMLCanvasElement)) return;
		canvas.__thinkingOrbDestroy?.();

		const requestedState = canvas.dataset.orbState ?? config.state;
		const state = Object.hasOwn(labels, requestedState) ? requestedState : "working";
		const speed = Math.max(0, readNumber(canvas.dataset.orbSpeed, readNumber(config.speed, 1)));
		const paused = readBoolean(canvas.dataset.orbPaused, config.paused);
		const devicePixelRatio = Math.min(2, window.devicePixelRatio || 1);
		const context = canvas.getContext("2d");
		if (!context) return;

		const now = performance.now();
		const carry = canvas.__thinkingOrbCarry;
		const continues = !reducedMotion && carry && carry.n === N && now - carry.at < CARRY_MS;
		delete canvas.__thinkingOrbCarry;

		const instance = {
			canvas,
			context,
			size: readSize(canvas),
			speed,
			theme: readTheme(canvas),
			paused,
			devicePixelRatio,
			dark: false,
			ink: "#1a1a1a",
			visible: true,
			destroyed: false,
			drawn: false,
			still: false,
			ownsLabel: false,
			last: now,
			t: 0,
			yaw: continues ? carry.yaw + ((now - carry.at) / 1000) * carry.spin * speed : 0.35,
			spin: continues ? carry.spin : SPIN_OF[behaviourOf[state]],
			lead: 1,
			fade: continues ? carry.fade : 0,
			fadeFrom: continues ? carry.fade : 0,
			tp: new Float64Array(N * 3),
			tr: new Float64Array(N),
			ta: new Float64Array(N),
			cp: new Float64Array(N * 3),
			cr: new Float64Array(N),
			ca: new Float64Array(N),
			px: new Float64Array(N),
			py: new Float64Array(N),
			pr: new Float64Array(N),
			pa: new Float64Array(N),
			order: Array.from({ length: N }, (_, i) => i),
			fromDelay: new Float64Array(N),
			liftStart: new Float64Array(N).fill(-9),
			nextLift: 0,
			liftCount: 0,
			lastLift: -1,
			groups: null,
		};
		begin(instance, state, continues ? carry : null);

		applySize(instance);
		if (!canvas.hasAttribute("role")) canvas.setAttribute("role", "img");
		if (!canvas.hasAttribute("aria-label")) {
			canvas.setAttribute("aria-label", labels[state]);
			instance.ownsLabel = true;
		}

		resolveInk(instance);
		instances.push(instance);
		intersectionObserver?.observe(canvas);

		const destroy = () => {
			if (instance.destroyed) return;
			instance.destroyed = true;
			// leave the last pose for whatever starts on this canvas next
			if (instance.drawn && !reducedMotion) canvas.__thinkingOrbCarry = snapshot(instance);
			intersectionObserver?.unobserve(canvas);
			if (canvas.__thinkingOrbDestroy === destroy) delete canvas.__thinkingOrbDestroy;
			removeSharedListenersWhenEmpty();
		};
		instance.destroy = destroy;
		canvas.__thinkingOrbDestroy = destroy;

		if (canAnimate(instance)) {
			compute(instance);
			paint(instance);
		} else {
			drawStill(instance);
		}
	});

	if (!instances.length) return () => {};

	const watched = [
		"data-orb-state",
		"data-orb-groups",
		"data-orb-paused",
		"data-orb-speed",
		"data-orb-size",
		"data-orb-theme",
	];
	attributeObserver = new MutationObserver((records) => {
		let themeChanged = false;
		records.forEach((record) => {
			if (watched.includes(record.attributeName)) {
				const instance = instances.find(
					(candidate) => candidate.canvas === record.target && !candidate.destroyed,
				);
				if (instance) updateAttribute(instance, record.attributeName);
				return;
			}
			// A theme or class change only matters where it can change a canvas's ink: on the canvas
			// or one of its ancestors.
			if (instances.some((instance) => !instance.destroyed && record.target.contains(instance.canvas))) {
				themeChanged = true;
			}
		});
		if (themeChanged) refreshThemes();
	});
	attributeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class", "data-theme", ...watched],
		subtree: true,
	});
	document.addEventListener("visibilitychange", requestRender);
	systemThemeQuery.addEventListener("change", refreshThemes);
	reducedMotionQuery.addEventListener("change", updateReducedMotion);
	ticker.steps.add(step);
	requestRender();

	return () => {
		// each instance's own destroy, never whatever is on the canvas now: a later call on the same
		// canvas owns it, and this one must not take it down
		instances.forEach((instance) => instance.destroy?.());
		removeSharedListeners();
	};
}

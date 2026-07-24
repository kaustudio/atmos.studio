// The view-model: renderVals() computes everything the view renders — a verbatim port of the
// design comp's renderVals. The JSX view (AppView) consumes this object untouched.
import React from 'react';

export const renderValsMethods = {
  renderVals() {
    const s = this.state;
    const prop = this.props.proportional ?? true;
    const mono = 'Neue Montreal';
    const w = (b) => prop ? Math.max(b.weight, 0.06) : 1;
    const pill = { fontFamily: mono, fontSize: '10.5px', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', color: 'var(--on-surface)', background: 'color-mix(in srgb, var(--on-surface) 9%, var(--surface))', border: '1px solid color-mix(in srgb, var(--on-surface) 15%, transparent)', padding: '8px 11px', lineHeight: 1 };
    const busy = s.stage === 'processing';

    // ===== contrast checker view (computed from sRGB relative luminance — WCAG, not OKLCH L) =====
    let cx = null;
    if (s.contrast) {
      const cp = this.contrastPalette();
      if (cp) {
        const sw = cp.swatches, N = sw.length, aaa = s.contrastLens === 'AAA';
        const th = s.contrastLarge ? (aaa ? 4.5 : 3) : (aaa ? 7 : 4.5);
        const chip = (b) => ({ hex: b.hex.toUpperCase(), style: { width: '24px', height: '24px', background: b.hex, flex: 'none', border: '1px solid color-mix(in srgb, var(--on-surface) 20%, transparent)' } });
        const rows = [{ isHeader: true, isBody: false, corner: '', chips: sw.map(chip) }];
        sw.forEach((rb, i) => {
          const cells = sw.map((cb, j) => {
            if (j >= i) return { blank: true, key: '', ratio: '', glyph: '', numStyle: {}, glyphStyle: {}, style: { flex: 1, minWidth: 0, height: '34px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)' } };
            const r = this.contrastRatio(rb.hex, cb.hex), pass = r >= th, dim = s.contrastPassOnly && !pass;
            return {
              blank: false, key: i + '-' + j, pass, ratio: r.toFixed(1), glyph: pass ? '✓' : '✕',
              style: { flex: 1, minWidth: 0, height: '34px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)', background: pass ? 'color-mix(in srgb, var(--on-surface) 6%, transparent)' : 'transparent', opacity: dim ? 0.22 : 1 },
              numStyle: { fontFamily: mono, fontSize: '11px', lineHeight: 1, color: 'var(--on-surface)' },
              glyphStyle: { fontSize: '8px', lineHeight: 1, color: pass ? 'var(--on-surface)' : 'var(--on-surface-muted)' },
            };
          });
          rows.push({ isHeader: false, isBody: true, chip: chip(rb), cells });
        });
        const textOn = sw.map((b) => {
          const on = this.onColor(b.hex); const r = this.contrastRatio(b.hex, on);
          return {
            hex: b.hex.toUpperCase(), onLabel: on === '#000000' ? 'Black text' : 'White text', ratio: r.toFixed(1),
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: b.hex, color: on, padding: '10px 12px', minWidth: 0 },
            nameStyle: { fontFamily: mono, fontSize: '11px', letterSpacing: '.02em' },
            metaStyle: { fontFamily: mono, fontSize: '10px', opacity: 0.85, whiteSpace: 'nowrap' },
          };
        });
        let best = null; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (i === j) continue; const r = this.contrastRatio(sw[i].hex, sw[j].hex); if (!best || r > best.r) best = { r, fg: sw[i].hex, bg: sw[j].hex }; }
        const summary = this.contrastSummary(cp);
        const segOn = { fontFamily: mono, fontSize: '9.5px', letterSpacing: '.1em', textTransform: 'uppercase', padding: '6px 11px', cursor: 'pointer', border: '1px solid var(--on-surface)', background: 'var(--on-surface)', color: 'var(--surface)' };
        const segOff = { fontFamily: mono, fontSize: '9.5px', letterSpacing: '.1em', textTransform: 'uppercase', padding: '6px 11px', cursor: 'pointer', border: '1px solid var(--line-strong)', background: 'none', color: 'var(--on-surface)' };
        cx = {
          name: cp.name, N, aaa, lensLabel: aaa ? 'AAA' : 'AA', threshold: th.toFixed(th % 1 ? 1 : 0),
          aa: summary.aa, total: summary.total, allPass: summary.aa === summary.total,
          large: s.contrastLarge, passOnly: s.contrastPassOnly,
          rows, textOn,
          matrixColsStyle: { display: 'flex', flexDirection: 'column', width: '100%' },
          sampleStyle: { background: best ? best.bg : 'var(--surface)', color: best ? best.fg : 'var(--on-surface)', padding: '20px', fontFamily: mono, fontSize: s.contrastLarge ? '23px' : '15px', lineHeight: 1.4, fontWeight: s.contrastLarge ? 500 : 400 },
          sampleRatio: best ? best.r.toFixed(1) : '—', sampleFg: best ? best.fg.toUpperCase() : '', sampleBg: best ? best.bg.toUpperCase() : '',
          setAA: () => this.setState({ contrastLens: 'AA' }), setAAA: () => this.setState({ contrastLens: 'AAA' }),
          aaStyle: aaa ? segOff : segOn, aaaStyle: aaa ? segOn : segOff, aaPressed: aaa ? 'false' : 'true', aaaPressed: aaa ? 'true' : 'false',
          setNormal: () => this.setState({ contrastLarge: false }), setLarge: () => this.setState({ contrastLarge: true }),
          normalStyle: s.contrastLarge ? segOff : segOn, largeStyle: s.contrastLarge ? segOn : segOff,
          normalPressed: s.contrastLarge ? 'false' : 'true', largePressed: s.contrastLarge ? 'true' : 'false',
          togglePass: () => this.setState((st) => ({ contrastPassOnly: !st.contrastPassOnly })),
          passStyle: s.contrastPassOnly ? segOn : segOff, passPressed: s.contrastPassOnly ? 'true' : 'false', passLabel: s.contrastPassOnly ? 'Passing only ✓' : 'Passing only',
        };
      }
    }

    let result = null;
    if (s.current) {
      const n = s.current.swatches.length;
      const totW = s.current.swatches.reduce((a, x) => a + x.weight, 0) || 1;
      const bands = s.current.swatches.map((b, i) => {
        const on = this.onColor(b.hex);
        const fmt = this.swatchFormats(b.hex);
        const divCol = on === '#000000' ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.24)';
        const hoverBg = on === '#000000' ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.16)';
        const cavBorder = on === '#000000' ? 'rgba(0,0,0,.32)' : 'rgba(255,255,255,.42)';
        const rowBase = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid ' + divCol, padding: '8px 14px', margin: 0, cursor: 'pointer', textAlign: 'left', color: on, transition: 'background .2s var(--ease-standard)' };
        const values = ['hex', 'rgb', 'cmyk', 'hsl'].map((key) => {
          const f = fmt[key];
          const copied = s.copied === key + '-' + i;
          return {
            key, labelText: f.label, caveat: f.caveat, hasCaveat: !!f.caveat, copied, notCopied: !copied,
            display: copied ? 'Copied' : f.display,
            valueAnim: { display: 'inline-block', animation: (copied ? 'val-mask-a' : 'val-mask-b') + ' .38s var(--ease-entrance) both' },
            aria: 'Copy ' + f.label + ' value ' + f.copy + ' for swatch ' + (i + 1) + (f.caveat ? ' — ' + f.caveat : ''),
            onCopy: () => this.copy(f.copy, key + '-' + i, 'Copied ' + f.copy),
            rowStyle: rowBase, rowHover: { background: hoverBg },
            colStyle: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 },
            labelRowStyle: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 },
            labelStyle: this.monoLabel(8.5, '.14em', { color: on, opacity: 0.75, flex: 'none' }),
            caveatStyle: { fontFamily: mono, fontSize: '7.5px', letterSpacing: '.05em', textTransform: 'uppercase', color: on, opacity: 0.62, border: '1px solid ' + cavBorder, padding: '1px 4px', whiteSpace: 'nowrap', flex: 'none' },
            valueStyle: { fontFamily: mono, fontSize: '11.5px', letterSpacing: '.02em', color: on, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
            iconWrapStyle: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', color: on, opacity: copied ? 1 : 0.5 },
          };
        });
        return {
          weightPct: Math.round((b.weight / totW) * 100) + '%',
          groupAria: 'Swatch ' + (i + 1) + ' of ' + n + ', ' + fmt.hex.display,
          values,
          onHarmony: () => this.openHarmony(b.hex),
          harmonyAria: 'Colour harmonies for ' + fmt.hex.display,
          infoBtnStyle: { position: 'absolute', top: '12px', right: '12px', zIndex: 4, width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid color-mix(in srgb, ' + on + ' 15%, transparent)', color: on, cursor: 'pointer', padding: 0 },
          style: { flexGrow: w(b), flexBasis: 0, minWidth: '190px', height: '340px', background: b.hex, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', willChange: 'opacity' },
          bandRingStyle: { position: 'absolute', inset: '0', boxShadow: 'none', opacity: 0, pointerEvents: 'none', zIndex: 1 },
          weightStyle: { fontFamily: mono, fontSize: '10px', letterSpacing: '.06em', color: on, opacity: 0.72, padding: '14px 14px 0', position: 'relative', zIndex: 2 },
          valuesWrap: { display: 'flex', flexDirection: 'column', width: '100%', position: 'relative', zIndex: 2 },
        };
      });
      const _ref = this.dispUrl(s.current), _hasRef = this.hasImg(s.current);
      // Build the reference thumbnail as a node so the <img> only exists once its src is resolved.
      const refImageNode = _hasRef ? React.createElement('button', { type: 'button', 'data-click-zoom': '1', 'data-focus': 'chrome', 'aria-label': 'View the reference image larger', style: { border: 'none', padding: 0, background: 'none', display: 'block', cursor: 'zoom-in' } }, React.createElement('img', { src: _ref, alt: 'The reference image you uploaded', style: { display: 'block', width: '96px', height: '64px', objectFit: 'cover', border: '1px solid var(--line-strong)' } })) : null;
      result = { name: s.current.name, rationale: s.current.rationale, descriptors: s.current.descriptors, bands, refImage: _ref, hasRef: _hasRef, noRef: !_hasRef, refImageNode };
    }
    // palette-level copy affordances
    const palBtn = { fontFamily: mono, fontSize: '10.5px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--on-surface)', background: 'var(--surface-white)', border: '1px solid var(--on-surface)', padding: '9px 14px', cursor: 'pointer', transition: 'background .15s ease,color .15s ease' };
    const copyPal = (kind) => { if (!s.current) return; if (kind === 'hex') this.copy(this.paletteHexList(s.current), 'pal-hex', 'Copied all ' + s.current.swatches.length + ' colours as a hex list'); else this.copy(this.paletteCss(s.current), 'pal-css', 'Copied palette as CSS custom properties'); };

    let procStatus = '';
    if (busy) { const STEPS = ['Reading light', 'Sampling the field', 'Clustering in OKLCH', 'Naming the mood']; procStatus = STEPS[Math.min(s.procStep, 3)] + '…'; }

    const curId = s.stage === 'result' && s.current ? s.current.id : null;
    const itemAria = (p) => 'Open ' + p.name + ' detail. Mood: ' + p.descriptors.join(', ') + '. Generated ' + this.relTime(p.time) + (p.id === curId ? '. Currently viewing' : '');

    // --- LIST view: canonical, one row each, keyboard-navigable ---
    const scopedAll = this.scopedFeed(s.feed);
    // pagination (list view only): per-page limit + clamped page window
    const pageSize = s.pageSize || 12;
    const pageCount = Math.max(1, Math.ceil(scopedAll.length / pageSize));
    const page = Math.min(s.page || 0, pageCount - 1);
    const scoped = s.feedView === 'list' ? scopedAll.slice(page * pageSize, (page + 1) * pageSize) : scopedAll;
    const feedList = scoped.map((p, idx) => {
      const isCur = p.id === curId;
      const met = this.paletteMetrics(p);
      const metrics = [
        { label: 'Dominant hue', text: met.hue + '°', count: '' + met.hue, dec: '0', suf: '°' },
        { label: 'Chroma', text: met.chroma.toFixed(3), count: met.chroma.toFixed(3), dec: '3', suf: '' },
        { label: 'Lightness', text: met.lMin + '–' + met.lMax + '%', count: '', dec: '0', suf: '' },
        { label: 'Temperature', text: met.temp, count: '', dec: '0', suf: '' },
        { label: 'Max contrast', text: met.contrastMax.toFixed(1) + ':1', count: met.contrastMax.toFixed(1), dec: '1', suf: ':1' },
        { label: 'AA pairs', text: met.aaPairs + ' / ' + met.totalPairs, count: '', dec: '0', suf: '' },
        { label: 'Archetype', text: met.mood, count: '', dec: '0', suf: '' },
      ];
      const bigStrip = p.swatches.map((b) => ({
        hex: b.hex.toUpperCase(),
        style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex, position: 'relative', display: 'flex', alignItems: 'flex-end', height: '88px', willChange: 'transform,opacity' },
        hexStyle: { fontFamily: 'Neue Montreal', fontSize: '8px', letterSpacing: '.02em', color: this.onColor(b.hex), padding: '5px 6px', whiteSpace: 'nowrap', overflow: 'hidden' },
      }));
      const denom = Math.max(1, p.swatches.length - 1);
      const stops = p.swatches.map((b, i) => b.hex + ' ' + Math.round(i / denom * 100) + '%').join(', ');
      return {
        name: p.name, descriptors: p.descriptors.join('   ·   '), time: this.relTime(p.time),
        current: isCur, ariaCurrent: isCur ? 'true' : undefined, curFlag: isCur ? '1' : '0', disabled: busy,
        aria: (isCur ? 'Currently viewing ' + p.name + '. ' : 'Load ' + p.name + ' into the result. ') + 'Mood: ' + p.descriptors.join(', ') + '. Dominant hue ' + met.hue + ' degrees, ' + met.temp.toLowerCase() + ', ' + met.aaPairs + ' of ' + met.totalPairs + ' accessible pairs. Generated ' + this.relTime(p.time),
        onClick: (e) => { if (!busy) this.loadIntoResult(p, e && e.currentTarget); },
        onDelete: (e) => { if (e && e.stopPropagation) e.stopPropagation(); const wrap = e && e.currentTarget && e.currentTarget.closest('[data-row-wrap]'); this.deletePalette(p.id, wrap); },
        deleteAria: 'Delete ' + p.name,
        onAssign: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.openAssign(p); },
        assignAria: 'Move ' + p.name + ' to a project',
        isExample: p.example === true,
        projectLabel: p.projectId ? this.projectName(p.projectId) : '', hasProject: !!p.projectId,
        onEnter: (e) => this.rowTintOn(e.currentTarget),
        onLeave: (e) => this.rowTintOff(e.currentTarget),
        onFocus: (e) => this.rowTintOn(e.currentTarget),
        rowid: p.id,
        rowStyle: { position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', background: isCur ? 'var(--surface-white)' : 'var(--surface-raised)', border: '0', borderTop: '1px solid var(--line)', padding: '0', margin: 0, cursor: busy ? 'not-allowed' : 'pointer', font: 'inherit', opacity: busy ? 0.45 : 1 },
        markerStyle: { position: 'absolute', left: '0', top: '0', bottom: '0', width: '3px', background: 'var(--on-surface)', opacity: isCur ? 1 : 0, pointerEvents: 'none', zIndex: 3 },
        restStrip: p.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })),
        bigStrip, metrics,
        hasImage: this.hasImg(p), noImage: !this.hasImg(p), refImage: this.dispUrl(p),
        mediaImgStyle: { width: '132px', height: '88px', flex: 'none', border: '1px solid var(--line)', willChange: 'transform,opacity', backgroundImage: 'url(' + this.dispUrl(p) + ')', backgroundSize: 'cover', backgroundPosition: 'center' },
        heroFallback: { width: '132px', height: '88px', flex: 'none', background: 'linear-gradient(135deg, ' + stops + ')', backgroundSize: '220% 220%', animation: this._reduce ? 'none' : 'gradient-drift ' + (9 + (idx % 5)) + 's ease-in-out infinite', animationDelay: (idx * -1.7) + 's', willChange: 'transform,opacity,background-position' },
        panelStyle: { height: '0px', overflow: 'hidden', willChange: 'height' },
        valuesStyle: { flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4,auto)', gap: '12px 22px', alignContent: 'flex-start', transformOrigin: 'left center', willChange: 'transform' },
      };
    });

    // --- PALETTE UNIVERSE: one real, focusable tile per palette (the engine clones these to fill) ---
    const UTW = 300, UTH = 372, HERO = 150;
    const cardBox = (isCur) => ({ position: 'absolute', top: '0', left: '0', width: UTW + 'px', height: UTH + 'px', display: 'block', textAlign: 'left', background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: 0, margin: 0, cursor: 'pointer', font: 'inherit', overflow: 'hidden' });
    const feedNodes = scoped.map((p, idx) => {
      const isCur = p.id === curId;
      const hasImage = this.hasImg(p);
      const denom = Math.max(1, p.swatches.length - 1);
      const stops = p.swatches.map((b, i) => b.hex + ' ' + Math.round(i / denom * 100) + '%').join(', ');
      // SAME palette-card content model as the list row — identical data, stacked arrangement
      const met = this.paletteMetrics(p);
      const cardMetrics = [
        { label: 'Hue', text: met.hue + '°' },
        { label: 'Chroma', text: met.chroma.toFixed(3) },
        { label: 'Lightness', text: met.lMin + '–' + met.lMax + '%' },
        { label: 'Temp', text: met.temp },
        { label: 'Max contrast', text: met.contrastMax.toFixed(1) + ':1' },
        { label: 'AA pairs', text: met.aaPairs + ' / ' + met.totalPairs },
        { label: 'Archetype', text: met.mood },
      ];
      return {
        name: p.name, descriptors: p.descriptors.join('  ·  '), current: isCur, ariaCurrent: isCur ? 'true' : undefined,
        aria: itemAria(p),
        hasImage, noImage: !hasImage, refImage: this.dispUrl(p),
        cardMetrics,
        onClick: (e) => { if (this._uMoved) { this._uMoved = false; return; } if (!busy) this.openOverlay(p, e && e.currentTarget); },
        onEnter: (e) => this.stackEnter(e.currentTarget), onLeave: (e) => this.stackLeave(e.currentTarget),
        onFocus: (e) => { if (this._kbdInput) this.centerOnTile(e.currentTarget); this.stackEnter(e.currentTarget); },
        onBlur: (e) => this.stackLeave(e.currentTarget),
        tileAbs: cardBox(isCur),
        tileFlow: Object.assign(cardBox(isCur), { position: 'relative', width: '100%', background: isCur ? 'var(--surface-white)' : 'var(--surface-raised)' }),
        heroWrapStyle: { position: 'absolute', top: '0', left: '0', right: '0', height: HERO + 'px', overflow: 'hidden', background: 'var(--line)' },
        heroFallback: { position: 'absolute', inset: '0', background: 'linear-gradient(135deg, ' + stops + ')', backgroundSize: '220% 220%', animation: this._reduce ? 'none' : 'gradient-drift ' + (10 + (idx % 4)) + 's ease-in-out infinite', animationDelay: (idx * -2.1) + 's' },
        imgStyle: { width: '100%', height: '100%', display: 'block', backgroundImage: 'url(' + this.dispUrl(p) + ')', backgroundSize: 'cover', backgroundPosition: 'center' },
        heroFadeStyle: { display: 'none' },
        pbaseStyle: { position: 'absolute', left: '0', right: '0', top: (HERO - 16) + 'px', height: (UTH - HERO + 38) + 'px', background: isCur ? 'var(--surface-white)' : 'var(--surface-raised)', display: 'flex', flexDirection: 'column', boxShadow: '0 0px 0px rgba(0,0,0,0)', zIndex: 1, willChange: 'transform', borderTop: '1px solid ' + (isCur ? 'var(--on-surface)' : 'var(--line)') },
        cardMetricsStyle: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', padding: '12px 14px 0' },
        ringStyle: { position: 'absolute', inset: '0', boxShadow: 'none', opacity: 0, pointerEvents: 'none', zIndex: 3 },
        strip: p.swatches.map((b) => ({ style: { flexGrow: w(b), flexBasis: 0, minWidth: 0, background: b.hex } })),
      };
    });

    // --- fullscreen palette detail overlay (reuses the swatch-band value system) ---
    let overlay = null;
    if (s.overlay) {
      const p = s.overlay, on2 = this.onColor, N = p.swatches.length, tw2 = p.swatches.reduce((a, x) => a + x.weight, 0) || 1;
      const obands = p.swatches.map((b, i) => {
        const on = on2.call(this, b.hex);
        const fmt = this.swatchFormats(b.hex);
        const sel = s.overlaySel === i;
        const divCol = on === '#000000' ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.24)';
        const hoverBg = on === '#000000' ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.16)';
        const cavBorder = on === '#000000' ? 'rgba(0,0,0,.32)' : 'rgba(255,255,255,.42)';
        const values = ['hex', 'rgb', 'cmyk', 'hsl'].map((key) => {
          const f = fmt[key]; const copied = s.copied === 'ov-' + key + '-' + i;
          return {
            key, labelText: f.label, caveat: f.caveat, hasCaveat: !!f.caveat, copied, notCopied: !copied,
            display: copied ? 'Copied' : f.display,
            valueAnim: { display: 'inline-block', animation: (copied ? 'val-mask-a' : 'val-mask-b') + ' .38s var(--ease-entrance) both' },
            aria: 'Copy ' + f.label + ' value ' + f.copy + ' for swatch ' + (i + 1) + (f.caveat ? ' — ' + f.caveat : ''),
            onCopy: () => this.copy(f.copy, 'ov-' + key + '-' + i, 'Copied ' + f.copy),
            rowStyle: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid ' + divCol, padding: '8px 14px', margin: 0, cursor: 'pointer', textAlign: 'left', color: on, transition: 'background .2s var(--ease-standard)' },
            rowHover: { background: hoverBg },
            colStyle: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 },
            labelRowStyle: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 },
            labelStyle: this.monoLabel(8.5, '.14em', { color: on, opacity: 0.75, flex: 'none' }),
            caveatStyle: { fontFamily: mono, fontSize: '7.5px', letterSpacing: '.05em', textTransform: 'uppercase', color: on, opacity: 0.62, border: '1px solid ' + cavBorder, padding: '1px 4px', whiteSpace: 'nowrap', flex: 'none' },
            valueStyle: { fontFamily: mono, fontSize: '11.5px', letterSpacing: '.02em', color: on, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
            iconWrapStyle: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', color: on, opacity: copied ? 1 : 0.5 },
          };
        });
        return {
          groupAria: 'Swatch ' + (i + 1) + ' of ' + N + ', ' + fmt.hex.display + (sel ? ', selected' : ''),
          selected: sel, pressed: sel ? 'true' : 'false',
          onSelect: () => this.overlaySelect(i, fmt.hex.display),
          weightPct: Math.round((b.weight / tw2) * 100) + '%',
          style: { position: 'relative', flexGrow: w(b), flexBasis: 0, minWidth: '210px', background: b.hex, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
          weightStyle: { fontFamily: mono, fontSize: '10px', letterSpacing: '.06em', color: on, opacity: 0.72, padding: '16px 14px 0' },
          selTagStyle: { display: sel ? 'inline-flex' : 'none', alignItems: 'center', gap: '6px', margin: '0 0 0 14px', fontFamily: mono, fontSize: '9px', letterSpacing: '.1em', textTransform: 'uppercase', color: on },
          selDotStyle: { width: '7px', height: '7px', background: on },
          selectBtnStyle: { position: 'absolute', top: '12px', right: '12px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel ? on : 'transparent', border: '1px solid ' + on, color: sel ? b.hex : on, cursor: 'pointer', padding: 0, zIndex: 3 },
          selectAria: (sel ? 'Deselect' : 'Select') + ' swatch ' + fmt.hex.display + ' as the current colour',
          onHarmony: () => this.openHarmony(b.hex),
          harmonyAria: 'Colour harmonies for ' + fmt.hex.display,
          infoBtnStyle: { position: 'absolute', top: '12px', right: '12px', zIndex: 4, width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid color-mix(in srgb, ' + on + ' 15%, transparent)', color: on, cursor: 'pointer', padding: 0 },
          ringStyle: { position: 'absolute', inset: '0', boxShadow: 'inset 0 0 0 3px ' + on, opacity: sel ? 1 : 0, pointerEvents: 'none' },
          valuesWrap: { display: 'flex', flexDirection: 'column', width: '100%' },
          values,
        };
      });
      overlay = {
        name: p.name, rationale: p.rationale, descriptors: p.descriptors, bands: obands,
        time: this.relTime(p.time), refImage: this.dispUrl(p), hasRef: this.hasImg(p),
        onDelete: () => this.deletePalette(p.id, null), deleteAria: 'Delete ' + p.name,
        onAssign: () => this.openAssign(p), assignAria: 'Move ' + p.name + ' to a project', projectLabel: p.projectId ? this.projectName(p.projectId) : 'Unfiled',
        hexListLabel: s.copied === 'ov-pal-hex' ? 'Copied ✓' : 'Hex list',
        cssLabel: s.copied === 'ov-pal-css' ? 'Copied ✓' : 'CSS variables',
        copyHexList: () => this.copy(this.paletteHexList(p), 'ov-pal-hex', 'Copied all ' + p.swatches.length + ' colours as a hex list'),
        copyCss: () => this.copy(this.paletteCss(p), 'ov-pal-css', 'Copied palette as CSS custom properties'),
      };
    }

    // --- per-swatch colour harmonies (OKLCH-derived, gamut-mapped) ---
    let harmony = null;
    if (s.harmony) {
      const baseHex = s.harmony.hex;
      const groups = this.harmonyGroups(baseHex).map((grp, gi) => ({
        name: grp.name, count: String(grp.hexes.length),
        cells: grp.hexes.map((hx, ci) => {
          const HX = hx.toUpperCase(), on = this.onColor(hx), copied = s.copied === 'hx-' + gi + '-' + ci, isBase = HX === baseHex;
          return {
            hex: HX, display: copied ? 'Copied' : HX, isBase,
            aria: 'Copy harmony colour ' + HX + (isBase ? ' (source colour)' : ''),
            onCopy: () => this.copy(HX, 'hx-' + gi + '-' + ci, 'Copied ' + HX),
            style: { flex: 1, minWidth: 0, height: '56px', background: hx, border: 'none', color: on, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '7px 8px', cursor: 'pointer', position: 'relative' },
            hover: { filter: this.lumHex(hx) < 0.08 ? 'brightness(1.35)' : 'brightness(0.88)' }, active: { filter: this.lumHex(hx) < 0.08 ? 'brightness(1.5)' : 'brightness(0.82)' },
            markStyle: { position: 'absolute', top: '7px', left: '8px', width: '5px', height: '5px', background: on, opacity: isBase ? 0.9 : 0, display: 'block' },
            hexStyle: { fontFamily: mono, fontSize: '9px', letterSpacing: '.02em', color: on, whiteSpace: 'nowrap' },
          };
        }),
      }));
      harmony = {
        hex: baseHex, groups,
        swatchStyle: { width: '26px', height: '26px', flex: 'none', background: baseHex, border: '1px solid var(--line-strong)' },
      };
    }

    // --- token export dialog ---
    let exportView = null;
    if (s.exportOpen && s.exportPalette) {
      const p = s.exportPalette, semantic = !!s.exportSemantic;
      const itemBase = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '12px 14px', cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)' };
      const mk = (id, label, ext) => ({ label, ext, onPick: () => this.doExport(p, id, semantic), onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), style: itemBase, extStyle: { fontFamily: mono, fontSize: '9px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--on-surface-muted)', flex: 'none' }, labelStyle: { fontFamily: 'Neue Montreal', fontSize: '13px', color: 'var(--on-surface)' } });
      exportView = {
        name: p.name, semanticOn: semantic, semanticChecked: semantic ? 'true' : 'false',
        layerLabel: semantic ? 'Exporting the semantic scaffold — refine before shipping.' : 'Exporting the primitive layer (swatches by weight).',
        formats: [
          mk('tailwind', 'Tailwind v4', '@theme · css'),
          mk('tokens', 'Design tokens (W3C)', 'json'),
          mk('figma', 'Figma variables', 'json'),
          mk('css', 'CSS custom properties', 'css'),
          mk('ase', 'Adobe swatches', 'ase'),
        ],
        toggleTrackStyle: { position: 'relative', display: 'inline-block', width: '34px', height: '18px', flex: 'none', background: semantic ? 'var(--on-surface)' : 'var(--line-strong)', transition: 'background .2s var(--ease-standard)', cursor: 'pointer' },
        toggleDotStyle: { position: 'absolute', left: '2px', top: '2px', width: '14px', height: '14px', background: 'var(--surface)', transform: semantic ? 'translateX(16px)' : 'translateX(0px)', transition: 'transform .2s var(--ease-standard)' },
        semanticTrackBg: semantic ? 'var(--on-surface)' : 'var(--line-strong)',
        semanticDotX: semantic ? 'translateX(14px)' : 'translateX(0px)',
        semanticLabel: semantic ? 'On' : 'Off',
      };
    }

    // --- projects: filter chips + assign/manage dialog data ---
    const chipStyle = (active) => ({ position: 'relative', zIndex: 1, fontFamily: 'Neue Montreal', fontSize: '10px', letterSpacing: 'var(--track-flat)', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer', border: 'none', background: 'transparent', color: active ? 'var(--surface)' : 'var(--on-surface-muted)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '7px', transition: this._reduce ? 'none' : 'color .2s var(--ease-standard)' });
    const countStyle = (active) => ({ fontFamily: mono, fontSize: '8.5px', opacity: 0.7, color: active ? 'var(--surface)' : 'var(--on-surface-muted)' });
    const mkChip = (id, label) => { const active = s.activeProject === id; const count = (id === null) ? s.feed.length : (id === '__unfiled__') ? s.feed.filter((p) => !p.projectId).length : s.feed.filter((p) => p.projectId === id).length; return { key: String(id), label, count: String(count), active, chipStyle: chipStyle(active), countStyle: countStyle(active), onClick: () => this.setActiveProject(id), aria: 'Show ' + label + ', ' + count + ' palette' + (count === 1 ? '' : 's') + (active ? ' (current filter)' : '') }; };
    const projectChips = [mkChip(null, 'All'), mkChip('__unfiled__', 'Unfiled'), ...s.projects.map((pr) => mkChip(pr.id, pr.name))];
    const hasProjects = s.projects.length > 0;

    let assignView = null;
    if (s.assignPalette) {
      const pal = s.assignPalette;
      const optStyle = (cur) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', border: '1px solid ' + (cur ? 'var(--on-surface)' : 'var(--line)'), padding: '11px 14px', cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)' });
      const mkOpt = (id, label) => { const cur = (pal.projectId || null) === (id || null); return { key: String(id), label, current: cur, markStyle: { width: '6px', height: '6px', flex: 'none', background: 'var(--on-surface)', opacity: cur ? 1 : 0 }, style: optStyle(cur), onEnter: (e) => this.rowTintOn(e.currentTarget), onLeave: (e) => this.rowTintOff(e.currentTarget), onFocus: (e) => this.rowTintOn(e.currentTarget), onBlur: (e) => this.rowTintOff(e.currentTarget), onPick: () => this.pickAssign(id), aria: 'Move ' + pal.name + ' to ' + label + (cur ? ' (current)' : '') }; };
      assignView = {
        name: pal.name, options: [mkOpt(null, 'Unfiled'), ...s.projects.map((pr) => mkOpt(pr.id, pr.name))],
        onCreate: (e) => { const inp = document.querySelector('[data-assign-new]'); const v = inp ? inp.value : ''; if (v && v.trim()) { this.newProjectAndAssign(v.trim()); } },
        onCreateKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v && v.trim()) this.newProjectAndAssign(v.trim()); } },
      };
    }

    let manageView = null;
    if (s.manageProjects) {
      manageView = {
        empty: !hasProjects, rows: s.projects.map((pr) => {
          const count = s.feed.filter((p) => p.projectId === pr.id).length; return {
            id: pr.id, name: pr.name, count: count + ' palette' + (count === 1 ? '' : 's'),
            onRename: (e) => { const inp = document.querySelector('[data-proj-name="' + pr.id + '"]'); if (inp && inp.value.trim() && inp.value.trim() !== pr.name) this.renameProject(pr.id, inp.value.trim()); },
            onRenameKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v.trim()) this.renameProject(pr.id, v.trim()); e.currentTarget.blur(); } },
            onDelete: () => this.deleteProject(pr.id), deleteAria: 'Delete project ' + pr.name + ' (its palettes move to Unfiled)',
          };
        }),
        onCreate: () => { const inp = document.querySelector('[data-manage-new]'); if (inp && inp.value.trim()) { this.createProject(inp.value.trim()); inp.value = ''; inp.focus(); } },
        onCreateKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.currentTarget.value; if (v.trim()) { this.createProject(v.trim()); e.currentTarget.value = ''; } } },
      };
    }

    return {
      isUpload: s.stage === 'upload', isProcessing: busy, isResult: s.stage === 'result', isError: s.stage === 'error',
      errorTitle: s.errorTitle, errorMsg: s.errorMsg,
      canReset: s.stage !== 'upload', busy, announce: s.announce,
      reset: () => this.doReset(),
      // orbit landing (first-visit brand arrival)
      // the landing surface doubles as the small-screen surface — on phones it is always up, with
      // the gate copy in place of the statement + CTA (the tool needs room a phone hasn't got)
      showLanding: this._landingUp(), narrow: s.narrow,
      showLoader: s.showLoader,
      // ring population — one slot per orb across all rings (sum of the ring counts). Deterministic,
      // and memoised so the array identity is stable across renders.
      orbitSlots: this._landingUp() ? this._ringSlots() : [],
      landingBlend: s.theme === 'dark' ? 'screen' : 'multiply',
      getStarted: () => this.getStarted(),
      // capability-conditional interpretation note: only where the live model call is actually
      // available. Reuses the SAME predicate that gates the call itself (interpretLive → pipeline),
      // so the disclosure can never drift out of step with whether a thumbnail is really sent.
      showInterpNote: this.canInterpretLive(),
      // glass-CTA variant (landing-scoped component builder) — squared glass, token-mixed, theme-correct
      glassCta: {
        display: 'inline-flex', alignItems: 'center', height: '36px', padding: '0 16px', borderRadius: '0',
        background: 'color-mix(in srgb, var(--on-surface) 7%, transparent)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid color-mix(in srgb, var(--on-surface) 15%, transparent)',
        color: 'var(--on-surface)', fontFamily: 'Neue Montreal', fontSize: '14px', fontWeight: 500,
        letterSpacing: 'var(--track-title)', whiteSpace: 'nowrap', cursor: 'pointer',
        transition: 'background-color .28s var(--ease-button-hover), border-color .28s var(--ease-button-hover), transform .12s var(--ease-standard)',
      },
      glassCtaHover: { background: 'color-mix(in srgb, var(--on-surface) 16%, transparent)', borderColor: 'color-mix(in srgb, var(--on-surface) 38%, transparent)' },
      glassCtaActive: { background: 'color-mix(in srgb, var(--on-surface) 24%, transparent)', borderColor: 'color-mix(in srgb, var(--on-surface) 48%, transparent)', transform: this._reduce ? 'none' : 'translateY(1px)' },
      // shared micro-interaction handlers (one signature across the whole UI)
      mEnter: (e) => this.mEnter(e), mLeave: (e) => this.mLeave(e), mDown: (e) => this.mDown(e), mUp: (e) => this.mUp(e),
      dimEnter: (e) => this.dimEnter(e), dimLeave: (e) => this.dimLeave(e),
      uploadHover: { background: 'color-mix(in srgb, var(--on-surface) 4%, var(--surface-white))' },
      // dropzone hover tint — JS-driven; leave restores the explicit defaults (never clears inline styles)
      dropEnter: (e) => { if (this.state.dragOver) return; const el = e.currentTarget; el.style.background = 'color-mix(in srgb, var(--on-surface) 1%, var(--surface-raised))'; el.style.borderColor = 'color-mix(in srgb, var(--on-surface) 45%, transparent)'; },
      dropLeave: (e) => { if (this.state.dragOver) return; const el = e.currentTarget; el.style.background = 'var(--surface-raised)'; el.style.borderColor = 'var(--line-strong)'; },
      // palette-level copy
      palBtn, palBtnHover: { background: 'var(--on-surface)', color: 'var(--surface)' }, palBtnActive: { transform: 'translateY(1px)' },
      hexListLabel: s.copied === 'pal-hex' ? 'Copied ✓' : 'Hex list',
      cssLabel: s.copied === 'pal-css' ? 'Copied ✓' : 'CSS variables',
      copyHexList: () => copyPal('hex'), copyCss: () => copyPal('css'),
      copyLabelStyle: this.monoLabel(10, '.12em', { color: 'var(--on-surface-muted)' }),
      deferNoteStyle: { fontFamily: mono, fontSize: '10px', letterSpacing: '.02em', color: 'var(--on-surface-muted)', marginLeft: 'auto' },
      // feed states + view toggle
      feedEmpty: scoped.length === 0, feedHasItems: scoped.length > 0,
      // projects
      projectChips, hasProjects, activeIsAll: s.activeProject === null,
      showProjectsBar: s.feed.length > 0 || s.projects.length > 0,
      onOpenManage: () => this.openManage(),
      assign: assignView, hasAssign: !!s.assignPalette, closeAssign: () => this.closeAssign(), trapAssign: (e) => this.trapFocusIn('[data-assign-dialog]', e),
      manage: manageView, hasManage: !!s.manageProjects, closeManage: () => this.closeManage(), trapManage: (e) => this.trapFocusIn('[data-manage-dialog]', e),
      // portable project file
      fileMenuOpen: s.fileMenuOpen, toggleFileMenu: () => this.setState((st) => ({ fileMenuOpen: !st.fileMenuOpen })),
      showSaveActive: s.activeProject !== null,
      saveActiveFile: () => { this.setState({ fileMenuOpen: false }); this.saveProjectFile(s.activeProject); },
      saveArchiveFile: () => { this.setState({ fileMenuOpen: false }); this.saveProjectFile('archive'); },
      showIntroAgain: () => this.returnToIntro(),
      // on phones the wordmark rides at the top exactly as it does on desktop, and stays decorative:
      // there is no tool behind the small-screen surface to hand a "back to the start" button to
      showLogoButton: !!s.landingDismissed && !s.narrow,
      showLogoDecor: !s.landingDismissed || s.narrow,
      activeScopeLabel: (s.activeProject === '__unfiled__' ? 'Unfiled' : this.projectName(s.activeProject)),
      onOpenFile: () => { const inp = this.projectFileRef && this.projectFileRef.current; if (inp) inp.click(); },
      onProjectFileChange: (e) => { const f = e && e.target && e.target.files && e.target.files[0]; if (f) this.importProjectFile(f); if (e && e.target) e.target.value = ''; },
      projectFileRef: this.projectFileRef,
      isListView: s.feedView === 'list', isGridView: s.feedView === 'grid',
      setList: () => this.setFeedView('list'), setGrid: () => this.setFeedView('grid'), setReel: () => this.setFeedView('carousel'),
      listToggleStyle: this.viewToggleOptStyle(s.feedView === 'list'), gridToggleStyle: this.viewToggleOptStyle(s.feedView === 'grid'), reelToggleStyle: this.viewToggleOptStyle(s.feedView === 'carousel'),
      listPressed: s.feedView === 'list' ? 'true' : 'false', gridPressed: s.feedView === 'grid' ? 'true' : 'false', reelPressed: s.feedView === 'carousel' ? 'true' : 'false',
      listTab: s.feedView === 'list' ? 0 : -1, gridTab: s.feedView === 'grid' ? 0 : -1, reelTab: s.feedView === 'carousel' ? 0 : -1,
      reelStyle: { display: s.feedView === 'carousel' ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 90, background: 'var(--surface-raised)', overflow: 'hidden', overscrollBehavior: 'none' },
      reelEmpty: s.feedView === 'carousel' && this.reelPalettes().length === 0,
      reelCloseRef: (this.reelCloseRef = this.reelCloseRef || React.createRef()),
      viewTogglePill: { position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 3)', transform: 'translateX(' + (s.feedView === 'carousel' ? 200 : s.feedView === 'grid' ? 100 : 0) + '%)', background: 'var(--on-surface)', transition: this._reduce ? 'none' : 'transform .5s cubic-bezier(.625,.05,0,1)' },
      viewToggleKey: (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
        e.preventDefault();
        const order = ['list', 'grid', 'carousel'];
        const next = order[(order.indexOf(this.state.feedView) + dir + order.length) % order.length];
        this.setFeedView(next);
        const grp = e.currentTarget && e.currentTarget.closest('[data-toggle-init]');
        if (grp) { const btns = [...grp.querySelectorAll('[data-toggle-btn]')]; const nb = btns[order.indexOf(next)]; if (nb) nb.focus(); }
      },
      feedList, feedNodes,
      showPagination: s.feed.length > 0 && s.feedView === 'list',
      // Osmo toggle-switch mechanic, adapted: sliding pill driven by the active index (squared, token
      // colors/easing), roving tabindex + arrow-key wrap on the buttons; state stays declarative.
      pageSizeOptions: [12, 24, 36].map((n, i) => ({
        label: '' + n, pressed: pageSize === n ? 'true' : 'false', tabIndex: pageSize === n ? 0 : -1,
        style: this.monoLabel(10, 'var(--track-flat)', { position: 'relative', zIndex: 1, padding: '6px 12px', cursor: 'pointer', border: 'none', background: 'transparent', color: pageSize === n ? 'var(--surface)' : 'var(--on-surface-muted)', transition: this._reduce ? 'none' : 'color .2s var(--ease-standard)', fontVariantNumeric: 'tabular-nums' }),
        onSelect: () => this.setPageSize(n),
      })),
      pageTogglePill: { position: 'absolute', top: '2px', bottom: '2px', left: '2px', width: 'calc((100% - 4px) / 3)', transform: 'translateX(' + ([12, 24, 36].indexOf(pageSize) * 100) + '%)', background: 'var(--on-surface)', transition: this._reduce ? 'none' : 'transform .5s cubic-bezier(.625,.05,0,1)' },
      pageToggleKey: (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return;
        e.preventDefault();
        const sizes = [12, 24, 36]; const next = sizes[(sizes.indexOf(this.state.pageSize) + dir + 3) % 3];
        this.setPageSize(next);
        const btns = [...document.querySelectorAll('[data-toggle-init] [data-toggle-btn]')]; const nb = btns[sizes.indexOf(next)]; if (nb) nb.focus();
      },
      pageLabel: 'Page ' + (page + 1) + ' / ' + pageCount,
      prevDisabled: page <= 0, nextDisabled: page >= pageCount - 1,
      prevPage: () => this.setPage(page - 1), nextPage: () => this.setPage(page + 1),
      prevStyle: this.pageNavStyle(page <= 0), nextStyle: this.pageNavStyle(page >= pageCount - 1),
      listWrapStyle: { display: s.feed.length > 0 && s.feedView === 'list' ? 'flex' : 'none', flexDirection: 'column', gap: '0', width: '100%', borderBottom: '1px solid var(--line)' },
      spaceStyle: { display: s.feed.length > 0 && s.feedView === 'grid' ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 90, background: 'var(--surface-raised)', overflow: this._reduce ? 'auto' : 'hidden', touchAction: this._reduce ? 'auto' : 'none', userSelect: 'none', cursor: this._reduce ? 'default' : 'grab' },
      universeEngine: !this._reduce, universeReduced: !!this._reduce,
      vignetteStyle: { position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', boxShadow: 'inset 0 0 120px 40px var(--surface-raised)', background: 'radial-gradient(ellipse at center, transparent 55%, color-mix(in srgb, var(--surface-raised) 72%, transparent) 100%)' },
      spaceRef: this.spaceRef, planeRef: this.planeRef, universeCloseRef: this.universeCloseRef,
      // overlay
      overlay, hasOverlay: !!s.overlay, closeOverlay: () => this.closeOverlay(),
      overlayRef: this.overlayRef, overlayBandsRef: this.overlayBandsRef, trapFocus: (e) => this.trapFocus(e),
      onBrowse: () => { if (this.fileRef.current) this.fileRef.current.click(); },
      onFile: (e) => { const f = e.target.files && e.target.files[0]; if (f) this.handleIncoming(f); e.target.value = ''; },
      onDrop: (e) => { e.preventDefault(); this.setState({ dragOver: false }); const f = e.dataTransfer.files && e.dataTransfer.files[0]; this.handleIncoming(f); },
      onDragOver: (e) => { e.preventDefault(); if (!this.state.dragOver) this.setState({ dragOver: true }); },
      onDragLeave: (e) => { e.preventDefault(); this.setState({ dragOver: false }); },
      onGridKey: (e) => this.onGridKey(e),
      fileRef: this.fileRef, canvasRef: this.canvasRef, resultRef: this.resultRef, progRef: this.progRef, gridRef: this.gridRef,
      dropStyle: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%', minHeight: '420px', padding: '40px', background: s.dragOver ? 'var(--surface-white)' : 'var(--surface-raised)', border: '1px ' + (s.dragOver ? 'solid' : 'dashed') + ' ' + (s.dragOver ? 'var(--on-surface)' : 'var(--line-strong)'), cursor: 'pointer', font: 'inherit', color: 'var(--on-surface)', transition: 'background .2s ease,border-color .2s ease' },
      // ===== nav controls: theme toggle + contrast checker =====
      isDark: s.theme === 'dark' ? 'true' : 'false',
      themeLabel: s.theme === 'dark' ? 'Dark' : 'Light',
      switchTrackBg: s.theme === 'dark' ? 'var(--on-surface)' : 'var(--line-strong)',
      switchDotX: s.theme === 'dark' ? 'translateX(14px)' : 'translateX(0px)',
      toggleTheme: () => this.toggleTheme(),
      openContrast: () => this.openContrast(),
      openExport: () => this.openExport(this.contrastPalette()),
      contrastDisabled: !this.contrastPalette(),
      contrastBtnRef: this.contrastBtnRef,
      navBtnStyle: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: '1px solid var(--line-strong)', padding: '7px 12px', fontFamily: 'Neue Montreal', fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--on-surface)', cursor: 'pointer', lineHeight: 1, transition: 'background .15s var(--ease-standard),border-color .15s var(--ease-standard),opacity .15s ease' },
      navBtnHover: { background: 'var(--surface-raised)', borderColor: 'var(--on-surface)' },
      contrast: cx, hasContrast: !!cx, closeContrast: () => this.closeContrast(), trapContrast: (e) => this.trapContrast(e),
      // delete + undo toast
      hasToast: !!s.toast, toastLabel: s.toast ? (s.toast.name + ' deleted') : '', undoDelete: () => this.undoDelete(),
      // quiet non-blocking notice (e.g. live interpreter unreachable → local fallback)
      hasNotice: !!s.notice, notice: s.notice || '',
      // per-swatch colour harmonies
      harmony, hasHarmony: !!s.harmony, closeHarmony: () => this.closeHarmony(), trapHarmony: (e) => this.trapHarmony(e),
      // token export
      export: exportView, hasExport: !!exportView,
      closeExport: () => this.closeExport(), trapExport: (e) => this.trapExport(e),
      toggleExportSemantic: () => this.setState((st) => ({ exportSemantic: !st.exportSemantic })),
      pill, result, procStatus,
      feedCount: scoped.length,
    };
  },
};

/* NUMBER ODOMETER — Osmo Supply's resource, integrated (19.09.26, by request: "a number counter with
   progressive blur whilst counting up to their respective number with as masked counter").

   The resource's own code is kept as delivered: the defaults, the data- attributes, the roller DOM,
   the cleanup, the resize recalculation and the programmatic update. What this file adds is only what
   the page needs to host it, each marked [ATMOS]:

   [ATMOS 1] SCOPED AND DESTROYABLE. The resource scans the whole document on DOMContentLoaded and
             never lets go. /about is a route that mounts and unmounts, so this takes the page's root,
             is started by AboutPage with the page's other modules, and returns a destroy that kills
             its timelines and removes its resize listener. GSAP is the page's global copy
             (window.gsap), as every module here reads it.
   [ATMOS 2] THE BLUR, by request. While a number counts it resolves out of the page's focus blur (the
             9px the colour demonstrations arrive from, focusMotion in renderVals), on the roll's own
             duration and a curve that eases out as the digits slow, so it is sharpest as it lands.
             On the element, not the rollers: each roller sits in a clipping mask, and a blur there
             would be cut to a hard edge at every column.
   [ATMOS 3] BUILT ONCE THE FACE HAS LOADED. The resource measures each growing column in ems and
             keeps that width after it lands. Measured in the fallback face, a column is the wrong
             width in Neue Montreal, so the rollers are built on document.fonts.ready.
   [ATMOS 4] A CATCH-UP, because a trigger created with its start already passed never plays its
             animation here (the page note in pageReveal.js, and aboutCascade.js's sweep). A group
             whose start is behind the scroll position plays as soon as it is found, and a run that
             stalls (a backgrounded tab) is finished rather than left mid-count.
   [ATMOS 5] EACH COLUMN LANDS AT ITS OWN DIGIT'S WIDTH. The resource assumes tabular figures (its CSS
             asks for tabular-nums), and Neue Montreal has none. While a column rolls it is as wide as
             the widest digit in its strip, and a grown column kept that width after it landed, which
             left 2.5px after each grown 7 in 77.7%. A settle after landing fixed the width but read
             as the number tightening up (by request: "they shouldn't tighten up"). So each column's
             width moves to its landed digit's own width DURING the roll, while the strip is still
             moving and blurred. A grown column grows to that width rather than the strip's, and every
             other column narrows to it on the roll's own duration and curve. The number lands spaced
             as plain text, and nothing moves after it lands.
   */

function noop() { }

export function initNumberOdometer(root, options) {
  const gsap = window.gsap
  const ScrollTrigger = window.ScrollTrigger
  if (!gsap || !ScrollTrigger || !root) return noop
  try { gsap.registerPlugin(ScrollTrigger) } catch (e) { return noop }
  const opts = options || {}
  const blur = opts.blur > 0 ? opts.blur : 0
  const timelines = []
  const timers = []
  let destroyed = false
  let removeResize = noop

  const run = () => {
    if (destroyed || !root.isConnected) return
    const update = initNumberOdometerIn(root, gsap, ScrollTrigger, blur, timelines, (fn) => { removeResize = fn })
    destroy.update = update
    catchUp()
  }

  // [ATMOS 4] By the group's own position, not the trigger's start: a trigger created a moment ago has
  // not been measured yet, and its start then reads 0, which every scroll position has passed.
  function catchUp() {
    if (destroyed) return
    timelines.forEach(({ tl, group, enter }) => {
      if (tl.progress() > 0 || tl.isActive() || !group.isConnected) return
      if (group.getBoundingClientRect().top > window.innerHeight * enter) return
      tl.play()
      timers.push(setTimeout(() => { if (!destroyed && tl.progress() < 1) tl.progress(1) }, (tl.duration() + 2) * 1000))
    })
  }
  const onRefresh = () => catchUp()
  ScrollTrigger.addEventListener('refresh', onRefresh)
  window.addEventListener('load', onRefresh)

  // [ATMOS 3]
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run, run)
  else run()
  timers.push(setTimeout(catchUp, 1200), setTimeout(catchUp, 3000))

  function destroy() {
    destroyed = true
    timers.forEach(clearTimeout)
    try { ScrollTrigger.removeEventListener('refresh', onRefresh) } catch (e) { }
    window.removeEventListener('load', onRefresh)
    removeResize()
    timelines.forEach(({ tl }) => {
      try { if (tl.scrollTrigger) tl.scrollTrigger.kill() } catch (e) { }
      try { tl.kill() } catch (e) { }
    })
  }
  return destroy
}

/* ---- the resource, as delivered, apart from the [ATMOS] lines ---------------------------------- */

function initNumberOdometerIn(root, gsap, ScrollTrigger, blur, timelines, onResizeBound) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const initFlag = 'data-odometer-initialized'
  const activeTweens = new WeakMap()

  // Configuration
  const defaults = {
    duration: 1,
    ease: 'power3.out',
    elementStagger: 0.1,
    digitStagger: 0.04,
    revealDuration: 0.5,
    revealEase: 'power2.out',
    triggerStart: 'top 80%',
    staggerOrder: 'left',
    digitCycles: 2
  }

  // Scroll-triggered groups
  root.querySelectorAll('[data-odometer-group]').forEach(group => { // [ATMOS 1] root, not document
    if (group.hasAttribute(initFlag)) return
    group.setAttribute(initFlag, '')

    const elements = Array.from(group.querySelectorAll('[data-odometer-element]'))
    if (!elements.length || prefersReducedMotion) return

    const staggerOrder = group.getAttribute('data-odometer-stagger-order') || defaults.staggerOrder
    const triggerStart = group.getAttribute('data-odometer-trigger-start') || defaults.triggerStart
    const elementStagger = parseFloat(group.getAttribute('data-odometer-stagger')) || defaults.elementStagger

    const elementData = elements.map(el => {
      const originalText = el.textContent.trim()
      const hasExplicitStart = el.hasAttribute('data-odometer-start')
      const startValue = parseFloat(el.getAttribute('data-odometer-start')) || 0
      const duration = parseFloat(el.getAttribute('data-odometer-duration')) || defaults.duration
      const step = getLineHeightRatio(el)

      let segments = parseSegments(originalText)
      segments = mapStartDigits(segments, startValue)
      segments = markHiddenSegments(segments, startValue)

      const grow = shouldGrow(el, hasExplicitStart, startValue, segments)
      const { rollers, revealEls } = buildRollerDOM(el, segments, step, grow)

      const fontSize = parseFloat(getComputedStyle(el).fontSize)
      const ownEm = ownWidths(el, originalText, fontSize) // [ATMOS 5]
      const revealData = revealEls.map(revealEl => {
        // [ATMOS 5] a grown column grows to its landed digit's width, not the strip's
        const widthEm = ownEm.has(revealEl) ? ownEm.get(revealEl) : revealEl.offsetWidth / fontSize
        gsap.set(revealEl, { width: 0, overflow: 'hidden' })
        return { el: revealEl, widthEm }
      })

      return { el, rollers, duration, step, revealData, originalText, ownEm, fontSize }
    })

    const ordered = applyStaggerOrder(elementData, staggerOrder)

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: group,
        start: triggerStart,
        once: true
      },
      onComplete() {
        elementData.forEach(({ el, originalText, step }) => {
          cleanupElement(el, originalText)
        })
      }
    })
    // [ATMOS 1, 4] held for destroy and the catch-up, with the enter line its start names ('top N%')
    const enterMatch = /^top\s+(\d+(?:\.\d+)?)%$/.exec(triggerStart.trim())
    timelines.push({ tl, group, enter: enterMatch ? parseFloat(enterMatch[1]) / 100 : 0.8 })

    ordered.forEach((data, orderIdx) => {
      const { el, rollers, duration, step, revealData, ownEm, fontSize } = data
      const growing = new Set(revealData.map(r => r.el)) // [ATMOS 5]
      const offset = orderIdx * elementStagger

      // [ATMOS 2] the count resolves out of the blur as it slows
      if (blur) {
        tl.fromTo(el, { filter: 'blur(' + blur + 'px)' }, {
          filter: 'blur(0px)',
          duration: duration + (rollers.length - 1) * defaults.digitStagger,
          ease: 'power2.out',
          clearProps: 'filter'
        }, offset)
      }

      revealData.forEach(({ el, widthEm }) => {
        tl.to(el, {
          width: widthEm + 'em',
          opacity: 1,
          duration: defaults.revealDuration,
          ease: defaults.revealEase
        }, offset)
      })

      rollers.forEach(({ roller, targetPos }, digitIdx) => {
        const reversedIdx = rollers.length - 1 - digitIdx
        tl.to(roller, {
          y: -targetPos * step + 'em',
          duration,
          ease: defaults.ease,
          force3D: true
        }, offset + reversedIdx * defaults.digitStagger)
        // [ATMOS 5] the column narrows to its landed digit as the strip slows, on the strip's own curve
        const mask = roller.parentNode
        if (!growing.has(mask) && ownEm.has(mask)) {
          tl.fromTo(mask, { width: mask.offsetWidth / fontSize + 'em' }, {
            width: ownEm.get(mask) + 'em',
            duration,
            ease: defaults.ease
          }, offset + reversedIdx * defaults.digitStagger)
        }
      })
    })
  })

  // Programmatic update (optional add-on)
  return function updateOdometer(el, newText, options = {}) {
    const currentText = el.textContent.trim()
    if (currentText === newText) return

    const duration = options.duration || defaults.duration
    const ease = options.ease || defaults.ease
    const step = getLineHeightRatio(el)

    // Kill any running animation and clear its inline style locks
    const existing = activeTweens.get(el)
    if (existing) {
      existing.kill()
      gsap.set(el, { clearProps: 'width,overflow' })
    }

    // Measure current width before rebuilding (in em for responsive scaling)
    const fontSize = parseFloat(getComputedStyle(el).fontSize)
    const oldWidthEm = el.getBoundingClientRect().width / fontSize

    // Parse current text as start, new text as end
    const startSegments = parseSegments(currentText)
    const startDigitsStr = startSegments
      .filter(s => s.type === 'digit')
      .map(s => s.char)
      .join('')
    const startValue = parseInt(startDigitsStr, 10) || 0

    let segments = parseSegments(newText)
    segments = mapStartDigits(segments, startValue)
    segments = markHiddenSegments(segments, startValue)
    const { rollers, revealEls } = buildRollerDOM(el, segments, step, true)

    // Measure new natural width (in em)
    const newWidthEm = el.getBoundingClientRect().width / fontSize
    const widthChanged = Math.abs(oldWidthEm - newWidthEm) > 0.01

    // Lock to old width for smooth transition
    if (widthChanged) {
      gsap.set(el, { width: oldWidthEm + 'em', overflow: 'hidden' })
    }

    const tl = gsap.timeline({
      onComplete() {
        cleanupElement(el, newText)
        activeTweens.delete(el)
      }
    })
    activeTweens.set(el, tl)

    // Animate element width
    if (widthChanged) {
      tl.to(el, {
        width: newWidthEm + 'em',
        duration: defaults.revealDuration,
        ease: defaults.revealEase
      }, 0)
    }

    // Fade in hidden statics
    revealEls.forEach(revealEl => {
      if (revealEl.getAttribute('data-odometer-part') === 'static') {
        tl.to(revealEl, { opacity: 1, duration: 0.2 }, 0)
      }
    })

    // Roll digits
    rollers.forEach(({ roller, targetPos }, digitIdx) => {
      const reversedIdx = rollers.length - 1 - digitIdx
      tl.to(roller, {
        y: -targetPos * step + 'em',
        duration,
        ease,
        force3D: true
      }, reversedIdx * defaults.digitStagger)
    })
  }

  // Helpers
  // [ATMOS 5] each column's width once it holds only its landed digit: a probe of the column itself
  // (its padding, its inline height), set with that digit, measured out of flow
  function ownWidths(el, text, fontSize) {
    const digits = [...text].filter(c => /\d/.test(c))
    const widths = new Map()
    el.querySelectorAll('[data-odometer-part="mask"]').forEach((mask, i) => {
      const probe = mask.cloneNode(false)
      probe.textContent = digits[i] || ''
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      el.appendChild(probe)
      widths.set(mask, probe.offsetWidth / fontSize)
      probe.remove()
    })
    return widths
  }

  function getLineHeightRatio(el) {
    const cs = getComputedStyle(el)
    const lh = cs.lineHeight
    if (lh === 'normal') return 1.2
    return parseFloat(lh) / parseFloat(cs.fontSize)
  }

  function parseSegments(text) {
    return [...text].map(char => ({
      type: /\d/.test(char) ? 'digit' : 'static',
      char
    }))
  }

  function mapStartDigits(segments, startValue) {
    const digitSlots = segments.filter(s => s.type === 'digit')
    const padded = String(Math.floor(Math.abs(startValue)))
      .padStart(digitSlots.length, '0')
      .slice(-digitSlots.length)
    let di = 0
    return segments.map(s =>
      s.type === 'digit'
        ? { ...s, startDigit: parseInt(padded[di++], 10) }
        : s
    )
  }

  function markHiddenSegments(segments, startValue) {
    const totalDigits = segments.filter(s => s.type === 'digit').length
    const absStart = Math.floor(Math.abs(startValue))
    const startDigitCount = absStart === 0 ? 1 : String(absStart).length
    const leadingZeros = Math.max(0, totalDigits - startDigitCount)
    if (leadingZeros === 0) return segments
    let digitsSeen = 0
    let firstDigitSeen = false
    let prevDigitHidden = false
    return segments.map(seg => {
      if (seg.type === 'digit') {
        firstDigitSeen = true
        const hidden = digitsSeen < leadingZeros
        prevDigitHidden = hidden
        digitsSeen++
        return { ...seg, hidden }
      }
      const hidden = firstDigitSeen && prevDigitHidden
      return { ...seg, hidden }
    })
  }

  function shouldGrow(el, hasExplicitStart, startValue, segments) {
    if (el.hasAttribute('data-odometer-grow')) {
      return el.getAttribute('data-odometer-grow') !== 'false'
    }
    if (!hasExplicitStart) return false
    const absStart = Math.floor(Math.abs(startValue))
    const startDigitCount = absStart === 0 ? 1 : String(absStart).length
    const endDigitCount = segments.filter(s => s.type === 'digit').length
    return startDigitCount < endDigitCount
  }

  function buildRollerDOM(el, segments, step, grow) {
    el.innerHTML = ''
    el.style.height = ''
    const rollers = []
    const revealEls = []
    const totalCells = 10 * defaults.digitCycles
    segments.forEach(seg => {
      if (seg.type === 'static') {
        const span = document.createElement('span')
        span.setAttribute('data-odometer-part', 'static')
        span.style.height = step + 'em'
        span.style.lineHeight = step
        span.textContent = seg.char
        el.appendChild(span)
        if (grow && seg.hidden) {
          gsap.set(span, { opacity: 0 })
          revealEls.push(span)
        }
        return
      }
      const mask = document.createElement('span')
      mask.setAttribute('data-odometer-part', 'mask')
      mask.style.height = step + 'em'
      mask.style.lineHeight = step
      const roller = document.createElement('span')
      roller.setAttribute('data-odometer-part', 'roller')
      roller.style.lineHeight = step

      const digits = []
      for (let d = 0; d < totalCells; d++) {
        digits.push(d % 10)
      }
      roller.textContent = digits.join('\n')
      mask.appendChild(roller)
      el.appendChild(mask)
      const startDigit = seg.startDigit || 0
      const isReveal = grow && seg.hidden
      gsap.set(roller, { y: isReveal ? step + 'em' : -startDigit * step + 'em' })
      const endDigit = parseInt(seg.char, 10)
      const targetPos = endDigit > startDigit ? endDigit : 10 + endDigit
      rollers.push({ roller, targetPos })
      if (isReveal) revealEls.push(mask)
    })
    return { rollers, revealEls }
  }

  function cleanupElement(el, originalText) {
    el.style.overflow = ''
    el.style.height = ''

    // Remove rollers, set final digit, clear inline bloat (but preserve width)
    const digits = [...originalText].filter(c => /\d/.test(c))
    let di = 0

    el.querySelectorAll('[data-odometer-part="mask"]').forEach(mask => {
      const roller = mask.querySelector('[data-odometer-part="roller"]')
      if (roller) roller.remove()
      mask.textContent = digits[di++] || ''
      mask.style.opacity = ''
      mask.style.overflow = ''
    })

    el.querySelectorAll('[data-odometer-part="static"]').forEach(stat => {
      stat.style.opacity = ''
    })
  }

  function recalcOnResize() {
    root.querySelectorAll('[data-odometer-element]').forEach(el => { // [ATMOS 1] root, not document
      // Force-complete any running programmatic animation
      const running = activeTweens.get(el)
      if (running) {
        running.progress(1)
        activeTweens.delete(el)
      }

      const hasRollers = el.querySelector('[data-odometer-part="roller"]')

      if (hasRollers) {
        // Pre-triggered: recalculate step-based inline styles
        const step = getLineHeightRatio(el)
        el.querySelectorAll('[data-odometer-part="mask"]').forEach(mask => {
          mask.style.height = step + 'em'
          mask.style.lineHeight = step
        })
        el.querySelectorAll('[data-odometer-part="roller"]').forEach(roller => {
          roller.style.lineHeight = step
        })
        el.querySelectorAll('[data-odometer-part="static"]').forEach(stat => {
          stat.style.lineHeight = step
        })
      }
      // Completed elements: width is em-based, scales automatically, don't touch
    })
    ScrollTrigger.refresh()
  }

  let resizeTimer
  let lastWidth = window.innerWidth
  const onResize = () => { // [ATMOS 1] named, so destroy can remove it
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth
      recalcOnResize()
    }, 250)
  }
  window.addEventListener('resize', onResize)
  onResizeBound(() => { clearTimeout(resizeTimer); window.removeEventListener('resize', onResize) })

  function applyStaggerOrder(items, order) {
    const arr = [...items]
    if (order === 'right') return arr.reverse()
    if (order === 'random') return shuffleArray(arr)
    return arr
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
}

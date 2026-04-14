function animateCounter(el: HTMLElement): void {
  const text = el.dataset.target ?? el.textContent ?? "";
  const suffix = text.replaceAll(/[\d.]/g, "");
  const target = Number.parseFloat(text.replaceAll(/[^\d.]/g, ""));

  if (Number.isNaN(target)) return;

  const duration = 1500;
  const start = performance.now();

  function step(now: number): void {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;

    if (target % 1 === 0) {
      el.textContent = Math.floor(current) + suffix;
    } else {
      el.textContent = current.toFixed(1) + suffix;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

const prefersReducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
const counterElements = document.querySelectorAll(".stat-value");

if (prefersReducedMotion) {
  counterElements.forEach((el) => {
    const targetText = (el as HTMLElement).dataset.target ?? el.textContent ?? "";
    el.textContent = targetText;
  });
} else {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target instanceof HTMLElement) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 },
  );

  counterElements.forEach((el) => {
    counterObserver.observe(el);
  });
}

function animateCounter(el: Element): void {
  const text = el.getAttribute("data-target") || el.textContent || "";
  const suffix = text.replace(/[\d.]/g, "");
  const target = parseFloat(text.replace(/[^\d.]/g, ""));

  if (isNaN(target)) return;

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

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 },
);

document.querySelectorAll(".stat-value").forEach((el) => {
  counterObserver.observe(el);
});

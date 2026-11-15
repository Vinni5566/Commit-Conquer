// Pixel confetti & sparkle particle burst generator
// Renders authentic square 8-bit particles on a transient canvas overlay

export function triggerPixelConfetti() {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  const colors = [
    "#f59e0b", // gold
    "#10b981", // emerald
    "#ec4899", // pink
    "#8b5cf6", // purple
    "#38bdf8", // sky
    "#f43f5e", // rose
    "#fbbf24", // amber
  ];

  type Particle = {
    x: number;
    y: number;
    size: number;
    color: string;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
  };

  const particles: Particle[] = [];
  const particleCount = 75;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const speed = Math.random() * 8 + 3;
    particles.push({
      x: width / 2,
      y: height * 0.45,
      size: Math.floor(Math.random() * 6 + 6), // Pixel block sizes 6-12px
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#f59e0b",
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4, // Upward initial velocity
      life: 0,
      maxLife: Math.floor(Math.random() * 40 + 50),
    });
  }

  let frame = 0;
  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let aliveCount = 0;
    for (const p of particles) {
      if (p.life < p.maxLife) {
        aliveCount++;
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.98; // air drag

        ctx.fillStyle = p.color;
        // Snap to nearest integer for crisp pixel aesthetics
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }

    frame++;
    if (aliveCount > 0 && frame < 120) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}

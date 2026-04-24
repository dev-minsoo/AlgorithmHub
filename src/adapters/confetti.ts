const COLORS = ["#22c55e", "#14b8a6", "#3b82f6", "#f59e0b", "#facc15", "#fb7185"];
const CONTAINER_ID = "algorithmhub-confetti-container";

type ConfettiPieceState = {
  element: HTMLSpanElement;
  angle: number;
  distance: number;
  rise: number;
  drift: number;
  rotationStart: number;
  rotationVelocity: number;
};

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function getContainer() {
  let container = document.getElementById(CONTAINER_ID);

  if (container) {
    return container;
  }

  container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.zIndex = "2147483646";
  document.body.appendChild(container);
  return container;
}

export function burstConfetti(origin?: { x: number; y: number }) {
  const container = getContainer();
  const width = window.innerWidth;
  const startX = origin?.x ?? width / 2;
  const startY =
    origin?.y ?? Math.min(window.innerHeight * 0.24, 156);
  const pieces: ConfettiPieceState[] = [];
  const total = 20;

  for (let index = 0; index < total; index += 1) {
    const piece = document.createElement("span");
    piece.style.position = "absolute";
    piece.style.left = `${startX}px`;
    piece.style.top = `${startY}px`;
    const shape = index % 3;
    piece.style.width = `${shape === 1 ? randomBetween(7, 9) : randomBetween(5, 10)}px`;
    piece.style.height = `${shape === 2 ? randomBetween(6, 8) : randomBetween(10, 16)}px`;
    piece.style.borderRadius = shape === 2 ? "999px" : `${randomBetween(1, 3)}px`;
    piece.style.background = COLORS[index % COLORS.length] ?? "#22c55e";
    piece.style.opacity = "1";
    piece.style.transform = `translate(0px, 0px) rotate(${randomBetween(0, 360)}deg)`;
    piece.style.willChange = "transform, opacity";
    container.appendChild(piece);
    pieces.push({
      element: piece,
      angle: ((index / total) * Math.PI * 2) + randomBetween(-0.2, 0.2),
      distance: randomBetween(80, 150),
      rise: randomBetween(18, 42),
      drift: randomBetween(110, 210),
      rotationStart: randomBetween(0, 360),
      rotationVelocity: randomBetween(260, 760),
    });
  }

  const startAt = performance.now();
  const duration = 1100;

  const animate = (now: number) => {
    const elapsed = now - startAt;
    const progress = Math.min(elapsed / duration, 1);
    const burstProgress = Math.min(progress / 0.45, 1);
    const fallProgress = Math.max((progress - 0.2) / 0.8, 0);

    pieces.forEach((piece) => {
      const spreadDistance = piece.distance * (1 - Math.pow(1 - burstProgress, 2));
      const horizontal = Math.cos(piece.angle) * spreadDistance;
      const upward = Math.sin(piece.angle) * spreadDistance - piece.rise;
      const gravityDrop = Math.pow(fallProgress, 2) * piece.drift;
      const vertical = upward + gravityDrop;
      const rotation = piece.rotationStart + progress * piece.rotationVelocity;
      piece.element.style.transform =
        `translate(${horizontal}px, ${vertical}px) rotate(${rotation}deg)`;
      piece.element.style.opacity = String(1 - progress);
    });

    if (progress < 1) {
      window.requestAnimationFrame(animate);
      return;
    }

    pieces.forEach((piece) => piece.element.remove());
    if (!container.childElementCount) {
      container.remove();
    }
  };

  window.requestAnimationFrame(animate);
}

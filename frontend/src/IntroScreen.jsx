import React, { useEffect, useRef, useState } from "react";

const TITLE_TEXT = "TREND RADAR";
const INTRO_DURATION = 3600;
const COPY_DELAY = 3000;
const MAX_PARTICLES = 980;

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function createRandom(seed) {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;

    return value / 4294967296;
  };
}

function getTextTargets(width, height) {
  const textCanvas = document.createElement("canvas");
  const context = textCanvas.getContext("2d", { willReadFrequently: true });
  const scale = Math.min(1, width / 1180);
  const fontSize = Math.max(42, Math.min(108, width * 0.112));
  const sampleGap = Math.max(5, Math.round(7 / scale));

  textCanvas.width = width;
  textCanvas.height = height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.font = `900 ${fontSize}px Inter, Pretendard, Arial, sans-serif`;
  context.letterSpacing = "0px";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(TITLE_TEXT, width / 2, height * 0.46);

  const imageData = context.getImageData(0, 0, width, height).data;
  const targets = [];

  for (let y = 0; y < height; y += sampleGap) {
    for (let x = 0; x < width; x += sampleGap) {
      const alpha = imageData[(y * width + x) * 4 + 3];

      if (alpha > 80) {
        targets.push({ x, y, alpha });
      }
    }
  }

  const step = Math.max(1, Math.ceil(targets.length / MAX_PARTICLES));

  return targets.filter((_, index) => index % step === 0).slice(0, MAX_PARTICLES);
}

function createParticles(width, height, reduceMotion) {
  const targets = getTextTargets(width, height);
  const random = createRandom(90827);
  const centerX = width / 2;
  const centerY = height * 0.48;

  return targets.map((target, index) => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * Math.max(width, height) * 0.68;
    const startX = centerX + Math.cos(angle) * distance;
    const startY = centerY + Math.sin(angle) * distance;

    return {
      targetX: target.x,
      targetY: target.y,
      startX: reduceMotion ? target.x : startX,
      startY: reduceMotion ? target.y : startY,
      size: 0.85 + random() * 1.9 + (index % 11 === 0 ? 0.8 : 0),
      delay: random() * 0.18,
      orbit: (random() - 0.5) * 80,
      phase: random() * Math.PI * 2,
      alpha: 0.42 + random() * 0.5,
    };
  });
}

export default function IntroScreen({ onEnter }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const frameRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let startedAt = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particlesRef.current = createParticles(width, height, reduceMotion);
      startedAt = performance.now();
    };

    const draw = (now) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const elapsed = now - startedAt;
      const rawProgress = reduceMotion ? 1 : Math.min(1, elapsed / INTRO_DURATION);
      const globalProgress = easeInOutCubic(rawProgress);

      context.clearRect(0, 0, width, height);

      const background = context.createRadialGradient(
        width / 2,
        height * 0.48,
        0,
        width / 2,
        height * 0.48,
        Math.max(width, height) * 0.62
      );
      background.addColorStop(0, "rgba(38, 75, 93, 0.18)");
      background.addColorStop(0.42, "rgba(6, 10, 18, 0.94)");
      background.addColorStop(1, "rgba(2, 5, 11, 1)");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      particlesRef.current.forEach((particle) => {
        const progress = Math.max(
          0,
          Math.min(1, (globalProgress - particle.delay) / (1 - particle.delay))
        );
        const settle = easeInOutCubic(progress);
        const orbit = (1 - settle) * particle.orbit;
        const spin = elapsed * 0.00042 + particle.phase;
        const x =
          particle.startX +
          (particle.targetX - particle.startX) * settle +
          Math.cos(spin) * orbit;
        const y =
          particle.startY +
          (particle.targetY - particle.startY) * settle +
          Math.sin(spin) * orbit * 0.72;
        const glow = 1 - Math.abs(0.74 - rawProgress) * 0.65;

        context.beginPath();
        context.fillStyle = `rgba(226, 242, 255, ${particle.alpha * Math.max(0.38, glow)})`;
        context.shadowBlur = 10 * Math.max(0.2, glow);
        context.shadowColor = "rgba(103, 232, 249, 0.35)";
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      });

      context.shadowBlur = 0;

      if (!reduceMotion) {
        frameRef.current = requestAnimationFrame(draw);
      }
    };

    resize();
    frameRef.current = requestAnimationFrame(draw);

    const readyTimer = window.setTimeout(
      () => setIsReady(true),
      reduceMotion ? 250 : COPY_DELAY
    );

    window.addEventListener("resize", resize);

    return () => {
      window.clearTimeout(readyTimer);
      window.removeEventListener("resize", resize);

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const enterDashboard = () => {
    if (!isReady || isExiting) {
      return;
    }

    setIsExiting(true);
    window.setTimeout(onEnter, 680);
  };

  const skipIntro = (event) => {
    event.stopPropagation();
    setIsReady(true);
    setIsExiting(true);
    window.setTimeout(onEnter, 360);
  };

  return (
    <section
      className={`intro-screen ${isReady ? "is-ready" : ""} ${
        isExiting ? "is-exiting" : ""
      }`}
      aria-label="Trend Radar intro"
      onClick={enterDashboard}
    >
      <canvas ref={canvasRef} className="intro-canvas" aria-hidden="true" />
      <button className="intro-skip" type="button" onClick={skipIntro}>
        Skip
      </button>
      <div className="intro-copy">
        <h1>
          <span>흩어진 뉴스 키워드에서</span>
          <span>오늘의 이슈 신호를 발견합니다</span>
        </h1>
        <p className="intro-description">
          <span>
            여러 RSS 뉴스 피드의 제목을 수집하고 반복 등장하는 키워드를 연결해
          </span>
          <span>
            언급량, 관계망, 관련 기사 근거로 사회적 관심의 흐름을 보여줍니다.
          </span>
        </p>
        <span className="intro-enter">클릭하여 탐색 시작</span>
      </div>
    </section>
  );
}

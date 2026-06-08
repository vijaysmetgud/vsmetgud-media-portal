import { useEffect, useRef } from "react";

function Visualizer({ analyser }) {

  const canvasRef = useRef();

  useEffect(() => {

    if (!analyser) return;

    const canvas =
      canvasRef.current;

    const ctx =
      canvas.getContext("2d");

    analyser.fftSize = 256;

    analyser.smoothingTimeConstant =
      0.92;

    const bufferLength =
      analyser.frequencyBinCount;

    const dataArray =
      new Uint8Array(bufferLength);

    let animationId;
    const animate = () => {

      animationId =
        requestAnimationFrame(
          animate
        );

      analyser.getByteFrequencyData(
        dataArray
      );

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const centerY =
        canvas.height / 2;

      let x = 10;   

      const spacing = (canvas.width - 20) / bufferLength;

      ctx.globalCompositeOperation =
        "lighter";

      const time = Date.now() / 80;

      for (let i = 0; i < bufferLength; i++) {

        const normalized = dataArray[i] / 255;

        let bassBoost = 1;

        if (i < 6)
          bassBoost = 2.2;
        else if (i < 12)
          bassBoost = 1.6;

        const barHeight =
          Math.pow(normalized, 0.8) *
          canvas.height *
          0.8 *
          bassBoost;
        
        const hue =
          (time + i * 8) % 360;  

        const gradient =
          ctx.createLinearGradient(
            0,
            centerY - barHeight,
            0,
            centerY + barHeight
          );

        gradient.addColorStop(0, `hsl(${hue},100%,65%)`);
        gradient.addColorStop(0.5, `hsl(${(hue+120)%360},100%,65%)`);
        gradient.addColorStop(1, `hsl(${(hue+240)%360},100%,65%)`);

        ctx.fillStyle = gradient;
        ctx.shadowColor = `hsl(${hue},100%,65%)`;
        ctx.shadowBlur = 4 + normalized * 8;

        ctx.beginPath();

        ctx.roundRect(
          x,
          centerY - barHeight,
          2.5,
          barHeight * 2,
          1.25
        );

        ctx.fill();

        ctx.globalAlpha = 0.15;

        ctx.fillRect(
          x,
          centerY + barHeight,
          2.5,
          barHeight * 0.4
        );

        ctx.globalAlpha = 1;

        x += spacing;
      }
      ctx.globalCompositeOperation =
        "source-over";
    };

    animate();

    return () => {
      cancelAnimationFrame(
        animationId
      );
    };

  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={180}
      style={{
        width: "100%",
        maxWidth: "1100px",
        background:
          "rgba(255,255,255,0.03)",
        borderRadius: "25px",
        display: "block"
      }}
    />
  );
}

export default Visualizer;
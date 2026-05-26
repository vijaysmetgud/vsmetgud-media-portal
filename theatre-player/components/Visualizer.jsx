import { useEffect, useRef } from "react";

function Visualizer({ analyser }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const bufferLength =
      analyser.frequencyBinCount;

    const dataArray =
      new Uint8Array(bufferLength);

    const animate = () => {
      requestAnimationFrame(animate);

      analyser.getByteFrequencyData(
        dataArray
      );

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      let x = 0;

      for (
        let i = 0;
        i < bufferLength;
        i++
      ) {
        const barHeight =
          dataArray[i];

        ctx.fillStyle = `hsl(${
          i * 4
        },100%,50%)`;

        ctx.fillRect(
          x,
          canvas.height - barHeight,
          6,
          barHeight
        );

        x += 8;
      }
    };

    animate();
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={150}
    />
  );
}

export default Visualizer;
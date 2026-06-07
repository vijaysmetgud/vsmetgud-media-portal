import { useEffect, useRef } from "react";

function Visualizer({ analyser }) {

  const canvasRef = useRef();

  useEffect(() => {

    if (!analyser) return;

    const canvas =
      canvasRef.current;

    const ctx =
      canvas.getContext("2d");

    analyser.fftSize = 128;

    analyser.smoothingTimeConstant =
      0.85;

    const bufferLength =
      analyser.frequencyBinCount;

    const dataArray =
      new Uint8Array(bufferLength);

    let animationId;

      const colors = [
        "#00E5FF",
        "#2979FF",
        "#7C4DFF",
        "#D500F9",
        "#FF4081",
        "#FF6D00",
        "#FFD600"
      ];

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

      let x = 0;

      for (
        let i = 0;
        i < bufferLength;
        i++
      ) {

        const barHeight =
          Math.min(
            dataArray[i] * 4,
            120
          );

        // const colors = [
        //   "#00E5FF", // Cyan
        //   "#2979FF", // Blue
        //   "#7C4DFF", // Purple
        //   "#D500F9", // Pink
        //   "#FF4081", // Rose
        //   "#FF6D00", // Orange
        //   "#FFD600"  // Yellow
        // ];

        // const value = dataArray[i];

        // let color;

        // if (value < 20) {
        //   color = "#00E5FF";
        // } else if (value < 40) {
        //   color = "#2979FF";
        // } else if (value < 50) {
        //   color = "#7C4DFF";
        // } else if (value < 70) {
        //   color = "#FF4081";
        // } else {
        //   color = "#FFD600";
        // }

        // ctx.fillStyle = color;

        // ctx.fillStyle =
        //   gradient;



        const hue = (i / bufferLength) * 360;

        const color = `hsl(${hue}, 100%, 60%)`;

        ctx.fillStyle = color;

        ctx.shadowColor = color;
        ctx.shadowBlur = 20;  

        ctx.beginPath();

        ctx.roundRect(
          x,
          centerY -
            barHeight / 2,
          6,
          barHeight * 2,
          4
        );

        ctx.fill();

        x += 12;
      }
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
import { useEffect, useRef, useState } from "react";

function EqualizerPanel({ bass, vocal, treble, analyser, delay, feedback }) {
  const canvasRef = useRef(null);
  const [activeMode, setActiveMode] = useState("cinema");

  // Presets
  const preset = (mode) => {
    setActiveMode(mode);

    if (!bass || !vocal || !treble) {
      return;
    }

    // Reset EQ
    bass.gain.value = 0;
    vocal.gain.value = 0;
    treble.gain.value = 0;

    switch (mode) {
      case "surround":
        bass.gain.value = 8;
        vocal.gain.value = 2;
        treble.gain.value = 8;
        if (delay) delay.delayTime.value = 0.08;
        if (feedback) feedback.gain.value = 0.5;
        break;

      case "cinema":
        bass.gain.value = 12;
        vocal.gain.value = 3;
        treble.gain.value = 6;
        break;

      case "music":
        bass.gain.value = 10;
        vocal.gain.value = 4;
        treble.gain.value = 7;
        break;

      case "night":
        bass.gain.value = 2;
        vocal.gain.value = 8;
        treble.gain.value = 2;
        break;

      case "vocal":
        bass.gain.value = 1;
        vocal.gain.value = 10;
        treble.gain.value = 3;
        break;
       
      case "party":
        bass.gain.value = 15;
        vocal.gain.value = 3;
        treble.gain.value = 10;
        break;

      case "podcast":
        bass.gain.value = 2;
        vocal.gain.value = 9;
        treble.gain.value = 3;
        break;

      case "bass-boost":
        bass.gain.value = 18;
        vocal.gain.value = 2;
        treble.gain.value = 2;
        break;  

      default:
        break;
    }
  };

  // Set initial EQ preset on mount
  useEffect(() => {
    if (bass && vocal && treble) {
      preset("cinema");
    }
  }, [bass, vocal, treble]);

  // Animation/visualizer loop
  useEffect(() => {
    if (!analyser) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;

        // Example: dynamic color based on height
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 150)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser]);

  return (
    <div className="equalizer-wrapper">
      <canvas
        ref={canvasRef}
        width="900"
        height="140"
        className="visualizer-canvas"
      />
      <div className="eq-panel">
        <button
          className={activeMode === "surround" ? "active-preset" : ""}
          onClick={() => preset("surround")}
        >
          Surround
        </button>
        <button
          className={activeMode === "cinema" ? "active-preset" : ""}
          onClick={() => preset("cinema")}
        >
          Cinema
        </button>
        <button
          className={activeMode === "music" ? "active-preset" : ""}
          onClick={() => preset("music")}
        >
          Music
        </button>
        <button
          className={activeMode === "night" ? "active-preset" : ""}
          onClick={() => preset("night")}
        >
          Night
        </button>
        <button
          className={activeMode === "vocal" ? "active-preset" : ""}
          onClick={() => preset("vocal")}
        >
          Vocal
        </button>
        <button
          className={activeMode === "party" ? "active-preset" : ""}
          onClick={() => preset("party")}
        >
          Party
        </button>
        <button
          className={activeMode === "podcast" ? "active-preset" : ""}
          onClick={() => preset("podcast")}
        >
          Podcast
        </button>
        <button
          className={activeMode === "bass-boost" ? "active-preset" : ""}
          onClick={() => preset("bass-boost")}
        >
          Bass Boost
        </button>
      </div>
    </div>
  );

}

export default EqualizerPanel;
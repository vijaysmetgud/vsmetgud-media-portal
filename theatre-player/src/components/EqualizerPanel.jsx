import { useEffect, useRef, useState } from "react";

function EqualizerPanel({ bass, vocal, treble, analyser, delay, feedback, currentFile, playPrevious, playPause, playNext, playing}) {
  const canvasRef = useRef(null);
  const [activeMode, setActiveMode] = useState("surround");

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

    if (delay) delay.delayTime.value = 0;
    if (feedback) feedback.gain.value = 0;

    switch (mode) {

      case "surround":
        bass.gain.value = 3;
        vocal.gain.value = 5;
        treble.gain.value = 6;

        if (delay) delay.delayTime.value = 0.015;
        if (feedback) feedback.gain.value = 0.09;
        break;

      case "theatre":
        bass.gain.value = 2;
        vocal.gain.value = 6;
        treble.gain.value = 7;

        if (delay) delay.delayTime.value = 0.012;
        if (feedback) feedback.gain.value = 0.08;
        break;

      case "cinema":
        bass.gain.value = 2;
        vocal.gain.value = 6;
        treble.gain.value = 5;
        break;

      case "music":
        bass.gain.value = 3;
        vocal.gain.value = 5;
        treble.gain.value = 7;
        break;

      case "night":
        bass.gain.value = 2;
        vocal.gain.value = 8;
        treble.gain.value = 2;
        break;

      case "vocal":
        bass.gain.value = -2;
        vocal.gain.value = 8;
        treble.gain.value = 4;
        break;

      case "party":
        bass.gain.value = 4;
        vocal.gain.value = 2;
        treble.gain.value = 9;
        break;

      case "podcast":
        bass.gain.value = 1;
        vocal.gain.value = 8;
        treble.gain.value = 2;
        break;

      case "bass-boost":
        bass.gain.value = 7;
        vocal.gain.value = -1;
        treble.gain.value = 1;
        break;

      default:
        break;
    }
  };

  // Set initial EQ preset on mount
  useEffect(() => {
    if (bass && vocal && treble) {
      preset("surround");
    }
  }, [bass, vocal, treble]);

  // Animation/visualizer loop
  useEffect(() => {
    if (!analyser) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.85;
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
        const barHeight = Math.pow(dataArray[i] / 255, 0.8) * canvas.height * 0.9;

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
        height="300"
        className="visualizer-canvas"
      />
      
      <div className="now-playing">
        🎬 Now Playing: {currentFile || "No media selected"}
      </div> 
      
      <div className="transport-controls">

        <button onClick={playPrevious}>
          ⏮ Previous
        </button>

        <button onClick={playPause}>
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>

        <button onClick={playNext}>
          Next ⏭
        </button>

      </div>

      <div className="eq-panel">
        <button
          className={activeMode === "surround" ? "active-preset" : ""}
          onClick={() => preset("surround")}
        >
          Surround
        </button>
         <button
          className={activeMode === "theatre" ? "active-preset" : ""}
          onClick={() => preset("theatre")}
        >
          Theatre
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
import {
  useEffect,
  useRef,
  useState
} from "react";


function EqualizerPanel({
  bass,
  vocal,
  treble,
  analyser,
  delay,
  feedback
}){

  const canvasRef =
    useRef(null);

  const [
    activeMode,
    setActiveMode
  ] = useState("cinema");

  // Presets
  const preset =
    (mode) => {

    setActiveMode(mode);

    if (
      !bass ||
      !vocal ||
      !treble
    ) {
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

        if (delay)
          delay.delayTime.value = 0.08;

        if (feedback)
          feedback.gain.value = 0.5;

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

      default:
        break;
    }
  };

  useEffect(() => {
    let animationId;

    const draw = () => {

      animationId =
        requestAnimationFrame(draw);

      ...
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
    
    if (
      !bass ||
      !vocal ||
      !treble
    ) {
      return;
    }

    bass.gain.value = 12;
    vocal.gain.value = 3;
    treble.gain.value = 6;

  }, [bass, vocal, treble]);

  // Beat visualizer
  useEffect(() => {

    if (!analyser)
      return;

    const canvas =
      canvasRef.current;

    if (!canvas)
      return;

    const ctx =
      canvas.getContext(
        "2d"
      );

    analyser.fftSize =
      128;

    const bufferLength =
      analyser
        .frequencyBinCount;

    const dataArray =
      new Uint8Array(
        bufferLength
      );

    const draw = () => {

      requestAnimationFrame(
        draw
      );

      analyser
        .getByteFrequencyData(
          dataArray
        );

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const barWidth =
        canvas.width /
        bufferLength;

      let x = 0;

      for (
        let i = 0;
        i < bufferLength;
        i++
      ) {

        const height =
          dataArray[i];

        const gradient =
          ctx.createLinearGradient(
            0,
            canvas.height,
            0,
            0
          );

        gradient.addColorStop(
          0,
          "#7c3aed"
        );

        gradient.addColorStop(
          1,
          "#d946ef"
        );

        ctx.fillStyle =
          gradient;

        ctx.fillRect(
          x,
          canvas.height -
            height,
          barWidth - 2,
          height
        );

        x += barWidth;
      }
    };

    draw();

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
          className={
            activeMode === "surround"
              ? "active-preset"
              : ""
          }
          onClick={() =>
            preset("surround")
          }
        >
          Surround
        </button>

        <button
          className={
            activeMode ===
            "cinema"
              ? "active-preset"
              : ""
          }
          onClick={() =>
            preset(
              "cinema"
            )
          }
        >
          Cinema
        </button>

        <button
          className={
            activeMode ===
            "music"
              ? "active-preset"
              : ""
          }
          onClick={() =>
            preset(
              "music"
            )
          }
        >
          Music
        </button>

        <button
          className={
            activeMode ===
            "night"
              ? "active-preset"
              : ""
          }
          onClick={() =>
            preset(
              "night"
            )
          }
        >
          Night
        </button>

        <button
          className={
            activeMode ===
            "vocal"
              ? "active-preset"
              : ""
          }
          onClick={() =>
            preset(
              "vocal"
            )
          }
        >
          Vocal
        </button>

      </div>

    </div>
  );
}

export default EqualizerPanel;

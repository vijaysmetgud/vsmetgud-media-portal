function EqualizerPanel({
  bass,
  vocal,
  treble
}) {
  const preset = (mode) => {
    if (!bass) return;

    switch (mode) {
      case "cinema":
        bass.gain.value = 10;
        treble.gain.value = 4;
        vocal.gain.value = 4;
        break;

      case "music":
        bass.gain.value = 12;
        treble.gain.value = 6;
        vocal.gain.value = 2;
        break;

      case "night":
        bass.gain.value = 3;
        treble.gain.value = 2;
        vocal.gain.value = 7;
        break;

      case "vocal":
        bass.gain.value = 2;
        treble.gain.value = 4;
        vocal.gain.value = 9;
        break;

      default:
        break;
    }
  };

  return (
    <div className="eq-panel">
      <button onClick={() => preset("cinema")}>
        Cinema
      </button>

      <button onClick={() => preset("music")}>
        Music
      </button>

      <button onClick={() => preset("night")}>
        Night
      </button>

      <button onClick={() => preset("vocal")}>
        Vocal
      </button>
    </div>
  );
}

export default EqualizerPanel;
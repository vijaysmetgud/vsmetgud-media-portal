export function setupTheatreAudio(mediaElement) {
  const audioContext =
    new (window.AudioContext ||
      window.webkitAudioContext)();

  const source =
    audioContext.createMediaElementSource(
      mediaElement
    );

  const analyser =
    audioContext.createAnalyser();

  analyser.fftSize = 256;

  // BASS BOOST
  const bass =
    audioContext.createBiquadFilter();

  bass.type = "lowshelf";
  bass.frequency.value = 180;
  bass.gain.value = 8;

  // TREBLE
  const treble =
    audioContext.createBiquadFilter();

  treble.type = "highshelf";
  treble.frequency.value = 4000;
  treble.gain.value = 4;

  // VOCAL CLARITY
  const vocal =
    audioContext.createBiquadFilter();

  vocal.type = "peaking";
  vocal.frequency.value = 1500;
  vocal.Q.value = 1;
  vocal.gain.value = 5;

  // THEATRE DELAY / ROOM FEEL
  const delay =
    audioContext.createDelay();

  delay.delayTime.value = 0.03;

  const feedback =
    audioContext.createGain();

  feedback.gain.value = 0.3;

  source.connect(bass);
  bass.connect(vocal);
  vocal.connect(treble);

  treble.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);

  delay.connect(analyser);
  analyser.connect(audioContext.destination);

  return {
    analyser,
    bass,
    vocal,
    treble
  };
}
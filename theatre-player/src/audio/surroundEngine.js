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

  // BASS
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
  treble.gain.value = 3;

  // VOCAL CLARITY
  const vocal =
    audioContext.createBiquadFilter();

  vocal.type = "peaking";
  vocal.frequency.value = 1500;
  vocal.Q.value = 1;
  vocal.gain.value = 4;

  // STEREO WIDENING
  const splitter =
    audioContext.createChannelSplitter(2);

  const merger =
    audioContext.createChannelMerger(2);

  const leftGain =
    audioContext.createGain();

  const rightGain =
    audioContext.createGain();

  leftGain.gain.value = 1.2;
  rightGain.gain.value = 1.2;

  // THEATRE REVERB
  const delay =
    audioContext.createDelay();

  delay.delayTime.value = 0.03;

  const feedback =
    audioContext.createGain();

  feedback.gain.value = 0.35;

  source.connect(bass);
  bass.connect(vocal);
  vocal.connect(treble);

  treble.connect(splitter);

  splitter.connect(leftGain, 0);
  splitter.connect(rightGain, 1);

  leftGain.connect(merger, 0, 0);
  rightGain.connect(merger, 0, 1);

  merger.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);

  delay.connect(analyser);
  analyser.connect(audioContext.destination);

  return {
    analyser,
    audioContext,
    bass,
    treble,
    vocal
  };
}
import { useRef, useState, useEffect } from "react";
import Playlist from "./Playlist";
import EqualizerPanel from "./EqualizerPanel";
import "../styles/theatre.css";

import {
  FaPlay,
  FaPause,
  FaExpand,
  FaVolumeUp
} from "react-icons/fa";

function TheatrePlayer() {

  const mediaRef = useRef(null);

  const audioContextRef =
    useRef(null);

  const analyserRef =
    useRef(null);

  const sourceRef =
    useRef(null);

  const bassRef =
    useRef(null);

  const vocalRef =
    useRef(null);

  const leftDelayRef =
    useRef(null);

  const rightDelayRef =
    useRef(null);

  const trebleRef =
    useRef(null);

  const [playlist,
    setPlaylist] =
    useState([]);

  const [currentIndex,
    setCurrentIndex] =
    useState(0);

  const [playing,
    setPlaying] =
    useState(false);

  const [progress,
    setProgress] =
    useState(0);

  const [volume,
    setVolume] =
    useState(1);
  
  const [mediaSrc, setMediaSrc] = useState("");
  const [currentFileName, setCurrentFileName] = useState("");  

  const currentFile =
    playlist[currentIndex] || null;

  const isVideo =
    currentFile?.type?.startsWith("video/") ||
    currentFileName.match(
      /\.(mp4|mkv|webm|mov|avi)$/i
    );
  

  const playPrevious = async () => {
    if (playlist.length === 0) return;

    const prevIndex =
      currentIndex === 0
        ? playlist.length - 1
        : currentIndex - 1;

    setCurrentIndex(prevIndex);

    setTimeout(async () => {
      try {
        await mediaRef.current?.play();
        setPlaying(true);
      } catch (err) {
        console.error(err);
      }
    }, 100);
  };

  const playNext = () => {
    if (playlist.length === 0) return;

    setCurrentIndex(prev =>
      prev === playlist.length - 1
        ? 0
        : prev + 1
    );
  };

  // volume
  useEffect(() => {

    if (mediaRef.current) {

      mediaRef.current.volume =
        volume;

    }

  }, [volume]);

  useEffect(() => {

    const media =
      new URLSearchParams(
        window.location.search
      ).get("media");

    if (!media) return;

    const decoded =
      decodeURIComponent(media);

    setMediaSrc(decoded);

    const parts =
      decoded.split("/");

    setCurrentFileName(
      decodeURIComponent(
        parts[parts.length - 1]
      )
    );

  }, []);

  // load selected file
  useEffect(() => {

    if (
      playlist[currentIndex]
    ) {

      const url =
        URL.createObjectURL(
          playlist[currentIndex]
        );

      setMediaSrc(url);

      setPlaying(false);
      setProgress(0);

      return () =>
        URL.revokeObjectURL(
          url
        );
    }

  }, [
    playlist,
    currentIndex
  ]);

  // setup equalizer for audio/video
  const setupAudio =
    () => {

    console.log("setupAudio called");

    if (
      !mediaRef.current
    ) return;

    try {

      if (
        audioContextRef.current
      ) {

        sourceRef.current
          ?.disconnect();

        audioContextRef
          .current
          .close();
      }

    } catch {}

    const audioContext =
      new window
        .AudioContext();

    const source =
      audioContext
        .createMediaElementSource(
          mediaRef.current
        );

    // bass
    const bass =
      audioContext
        .createBiquadFilter();

    bass.type =
      "lowshelf";

    bass.frequency.value =
      120;

    bass.gain.value =
      0;

    // vocal
    const vocal =
      audioContext
        .createBiquadFilter();

    vocal.type =
      "peaking";

    vocal.frequency.value =
      1800;

    vocal.Q.value =
      1;

    vocal.gain.value =
      0;

    // treble
    const treble =
      audioContext
        .createBiquadFilter();

    treble.type =
      "highshelf";

    treble.frequency.value =
      4500;

    treble.gain.value =
      0;

    // analyser
    const analyser =
      audioContext
        .createAnalyser();
    
    const masterGain =
      audioContext.createGain();

    masterGain.gain.value = 1.5; // 30% boost    

    const compressor =
      audioContext.createDynamicsCompressor();

    compressor.threshold.value = -15;
    compressor.knee.value = 20;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;    
   
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

    const leftDelay =
      audioContext.createDelay();

    const rightDelay =
      audioContext.createDelay();

    leftDelay.delayTime.value = 0.030;
    rightDelay.delayTime.value = 0.060;  

    analyser.fftSize =
      128;
    source.connect(bass);

    bass.connect(vocal);

    vocal.connect(treble);

    treble.connect(compressor);

    compressor.connect(splitter);

    splitter.connect(leftDelay, 0);
    splitter.connect(rightDelay, 1);

    leftDelay.connect(leftGain);
    rightDelay.connect(rightGain);

    const crossL =
      audioContext.createGain();

    const crossR =
      audioContext.createGain();

    leftDelay.connect(crossR);
    rightDelay.connect(crossL);

    crossR.connect(merger, 0, 1);
    crossL.connect(merger, 0, 0);


    crossL.gain.value = 0.45;
    crossR.gain.value = 0.45;

    const leftPanner =
      audioContext.createStereoPanner();

    const rightPanner =
      audioContext.createStereoPanner();

    leftPanner.pan.value = -1;
    rightPanner.pan.value = 1;

    leftGain.connect(leftPanner);
    rightGain.connect(rightPanner);

    leftPanner.connect(merger, 0, 0);
    rightPanner.connect(merger, 0, 1);

    merger.connect(
      analyser
    );

    const convolver =
      audioContext.createConvolver();

    const length =
      audioContext.sampleRate * 2;

    const impulse =
      audioContext.createBuffer(
        2,
        length,
        audioContext.sampleRate
      );

    for (let channel = 0; channel < 2; channel++) {

      const data =
        impulse.getChannelData(channel);

      for (let i = 0; i < length; i++) {

        data[i] =
          (Math.random() * 2 - 1) *
          Math.pow(
            1 - i / length,
            2
          );
      }
    }

    convolver.buffer = impulse;

    const wetGain =
      audioContext.createGain();

    const dryGain =
      audioContext.createGain();

    wetGain.gain.value = 0.25;
    dryGain.gain.value = 0.85;

    merger.connect(dryGain);

    merger.connect(convolver);

    convolver.connect(wetGain);

    dryGain.connect(masterGain);

    wetGain.connect(masterGain);

    masterGain.connect(
      audioContext.destination
    );

    audioContextRef.current =
      audioContext;

    analyserRef.current =
      analyser;

    sourceRef.current =
      source;

    bassRef.current =
      bass;

    vocalRef.current =
      vocal;

    trebleRef.current =
      treble;

    leftDelayRef.current =
      leftDelay;

    rightDelayRef.current =
      rightDelay;  
  };

  const handleUpload =
    (e) => {

    const files =
      Array.from(
        e.target.files
      );

    setPlaylist(files);
    setCurrentIndex(0);
  };

  const togglePlay =
    async () => {

    if (
      !mediaRef.current
    ) return;

    try {

      if (
        !audioContextRef
          .current
      ) {

        setupAudio();
      }

      if (playing) {

        mediaRef.current
          .pause();

        setPlaying(false);

      } else {

        await mediaRef
          .current
          .play();

        setPlaying(true);
      }

    } catch (err) {

      console.error("Audio setup error:", err);
    }
  };

  const handleLoadedMedia = async () => {

    if (!audioContextRef.current) {
      setupAudio();
    }

    try {
      await mediaRef.current.play();
      setPlaying(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimeUpdate =
    () => {

    const media =
      mediaRef.current;

    if (!media)
      return;

    const percent =
      (
        media.currentTime /
        media.duration
      ) * 100;

    setProgress(
      percent || 0
    );
  };

  const seek =
    (e) => {

    const media =
      mediaRef.current;

    if (!media)
      return;

    media.currentTime =
      (
        e.target.value /
        100
      ) *
      media.duration;

    setProgress(
      e.target.value
    );
  };

  const fullscreen =
    () => {

    if (
      mediaRef.current &&
      isVideo
    ) {

      mediaRef.current
        .requestFullscreen();
    }
  };

  return (

    <div className="theatre-container">

      {/* PLAYER AREA */}
      <div className="player-area">

        <h1 className="title">
          🎬 THEATRE MEDIA PLAYER
        </h1>

        <input
          type="file"
          multiple
          accept="audio/*,video/*"
          onChange={
            handleUpload
          }
        />

        {!currentFile && (
          <div className="empty">
            Select Audio/Video Files
          </div>
        )}

        {/* VIDEO WINDOW */}
        {mediaSrc && isVideo && (
          <div className="media-wrapper">
            <video
              ref={mediaRef}
              src={mediaSrc}
              className="media-player"
              controls
              autoPlay
              playsInline
              onLoadedMetadata={handleLoadedMedia}
              onTimeUpdate={handleTimeUpdate}
              onEnded={playNext}
            />
          </div>
        )}

        {/* AUDIO WINDOW */}
        {mediaSrc && !isVideo && (
          <audio
            ref={mediaRef}
            src={mediaSrc}
            onLoadedMetadata={handleLoadedMedia}
            onTimeUpdate={handleTimeUpdate}
            onEnded={playNext}
          />
        )}

        {/* EQUALIZER */}
        {mediaSrc && (
          <EqualizerPanel
            bass={bassRef.current}
            vocal={vocalRef.current}
            treble={trebleRef.current}
            analyser={analyserRef.current}
            leftDelay={leftDelayRef.current}
            rightDelay={rightDelayRef.current}
            currentFile={currentFile?.name || currentFileName}
            playPrevious={playPrevious}
            playPause={togglePlay}
            playNext={playNext}
            playing={playing}
            progress={progress}
            seek={seek}
            volume={volume}
            setVolume={setVolume}
            fullscreen={fullscreen}
          />
        )}

        {/* PLAYLIST */}
        {playlist.length > 0 && (
          <Playlist
            playlist={playlist}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
          />
        )} 

      </div>

    </div>
  );
}

export default TheatrePlayer;

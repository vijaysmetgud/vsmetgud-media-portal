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

  const playNext = async () => {
    if (playlist.length === 0) return;

    const nextIndex =
      currentIndex === playlist.length - 1
        ? 0
        : currentIndex + 1;

    setCurrentIndex(nextIndex);

    setTimeout(async () => {
      try {
        await mediaRef.current?.play();
        setPlaying(true);
      } catch (err) {
        console.error(err);
      }
    }, 100);
  };

  // volume
  useEffect(() => {

    if (mediaRef.current) {

      mediaRef.current.volume =
        volume;

    }

  }, [volume]);

  useEffect(() => {

  if (!mediaSrc) return;

  const timer =
    setTimeout(async () => {

      try {

        if (
          mediaRef.current
        ) {

          await mediaRef.current.play();

          setPlaying(true);

        }

      } catch (err) {

        console.error(err);

      }

    }, 500);

  return () =>
    clearTimeout(timer);

}, [mediaSrc]);

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

  useEffect(() => {
    if (!mediaRef.current || !mediaSrc) return;

    const playMedia = async () => {
      try {
        await mediaRef.current.play();
        setPlaying(true);
      } catch (err) {
        console.error(err);
      }
    };

    playMedia();
  }, [mediaSrc]);

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
      200;

    bass.gain.value =
      0;

    // vocal
    const vocal =
      audioContext
        .createBiquadFilter();

    vocal.type =
      "peaking";

    vocal.frequency.value =
      1000;

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
      3000;

    treble.gain.value =
      0;

    // analyser
    const analyser =
      audioContext
        .createAnalyser();

    analyser.fftSize =
      128;

    source.connect(bass);
    bass.connect(vocal);
    vocal.connect(treble);
    treble.connect(
      analyser
    );

    analyser.connect(
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
    setupAudio();

    setTimeout(async () => {
      try {
        await mediaRef.current.play();
        setPlaying(true);
      } catch (err) {
        console.error(err);
      }
    }, 100);
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

      {/* LEFT PLAYLIST */}
      <div className="sidebar">

        <Playlist
          playlist={
            playlist
          }
          setCurrentIndex={
            setCurrentIndex
          }
        />

      </div>

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
          />
        )}

        {/* EQUALIZER */}
        <EqualizerPanel
          bass={bassRef.current}
          vocal={vocalRef.current}
          treble={trebleRef.current}
          analyser={analyserRef.current}
          currentFile={currentFile?.name || currentFileName}
          playPrevious={playPrevious}
          playPause={togglePlay}
          playNext={playNext}
          playing={playing}
        />

        {!currentFile && (
          <div className="empty">
            Select Audio/Video Files
          </div>
        )}

        {/* CONTROLS */}
        <div className="controls">

          <button
            onClick={
              togglePlay
            }
          >
            {playing
              ? <FaPause />
              : <FaPlay />}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={
              progress
            }
            onChange={
              seek
            }
          />

          <div className="volume">

            <FaVolumeUp />

            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={
                volume
              }
              onChange={
                (e) =>
                  setVolume(
                    e.target
                      .value
                  )
              }
            />

          </div>

          <button
            onClick={
              fullscreen
            }
          >
            <FaExpand />
          </button>

        </div>

      </div>

    </div>
  );
}

export default TheatrePlayer;

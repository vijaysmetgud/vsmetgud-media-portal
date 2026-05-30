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

  const [mediaSrc,
    setMediaSrc] =
    useState("");

  const currentFile =
    playlist[currentIndex];

  const isVideo =
    currentFile?.type.startsWith(
      "video"
    );

  // volume
  useEffect(() => {

    if (mediaRef.current) {

      mediaRef.current.volume =
        volume;

    }

  }, [volume]);

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

      console.error(err);
    }
  };

  const handleLoadedMedia =
    () => {

    setupAudio();
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
          🎬 Theatre Media Player
        </h1>

        <input
          type="file"
          multiple
          accept="audio/*,video/*"
          onChange={
            handleUpload
          }
        />

        {/* EQUALIZER */}
        <EqualizerPanel
          bass={
            bassRef.current
          }
          vocal={
            vocalRef.current
          }
          treble={
            trebleRef.current
          }
          analyser={
            analyserRef.current
          }
        />

        {/* VIDEO WINDOW */}
        {currentFile &&
          isVideo && (

          <div className="media-wrapper">

            <video
              key={
                currentIndex
              }
              ref={
                mediaRef
              }
              src={
                mediaSrc
              }
              className="media-player"
              onLoadedMetadata={
                handleLoadedMedia
              }
              onTimeUpdate={
                handleTimeUpdate
              }
              preload="metadata"
            />

          </div>
        )}

        {/* AUDIO */}
        {currentFile &&
          !isVideo && (

          <audio
            key={
              currentIndex
            }
            ref={
              mediaRef
            }
            src={
              mediaSrc
            }
            onLoadedMetadata={
              handleLoadedMedia
            }
            onTimeUpdate={
              handleTimeUpdate
            }
            preload="metadata"
            style={{
              width:
                "100%"
            }}
          />
        )}

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

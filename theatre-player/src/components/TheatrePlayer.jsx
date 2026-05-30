import { useRef, useState, useEffect } from "react";
import Playlist from "./Playlist";
import EqualizerPanel from "./EqualizerPanel";

import {
  FaPlay,
  FaPause,
  FaExpand,
  FaVolumeUp
} from "react-icons/fa";

function TheatrePlayer() {
  const mediaRef = useRef();

  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mediaSrc, setMediaSrc] = useState("");

  const currentFile = playlist[currentIndex];

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {

    if (playlist[currentIndex]) {

      const url =
        URL.createObjectURL(
          playlist[currentIndex]
        );

      setMediaSrc(url);

      return () =>
        URL.revokeObjectURL(url);
    }

  }, [currentIndex, playlist]);

  const handleUpload = (e) => {

    const files =
      Array.from(e.target.files);

    setPlaylist(files);
    setCurrentIndex(0);

    if (files.length > 0) {
      setMediaSrc(
        URL.createObjectURL(files[0])
      );
    }
  };

  const togglePlay = async () => {

    if (!mediaRef.current) return;

    try {

      if (playing) {

        mediaRef.current.pause();
        setPlaying(false);

      } else {

        await mediaRef.current.play();
        setPlaying(true);
      }

    } catch (err) {

      console.error(
        "Playback failed:",
        err
      );
    }
  };

  const handleTimeUpdate = () => {
    const media = mediaRef.current;

    if (!media) return;

    const percent =
      (media.currentTime / media.duration) * 100;

    setProgress(percent || 0);
  };

  const seek = (e) => {
    const media = mediaRef.current;

    media.currentTime =
      (e.target.value / 100) * media.duration;

    setProgress(e.target.value);
  };

  const fullscreen = () => {
    mediaRef.current.requestFullscreen();
  };

  const isVideo =
    currentFile?.type.startsWith("video");

  return (
    <div className="theatre-container">

      <div className="sidebar">
        <Playlist
          playlist={playlist}
          setCurrentIndex={setCurrentIndex}
        />
      </div>

      <div className="player-area">

        <h1 className="title">
          🎬 Theatre Media Player
        </h1>

        <input
          type="file"
          multiple
          accept="audio/*,video/*"
          onChange={handleUpload}
        />

        <div className="media-wrapper">

          {currentFile ? (
            isVideo ? (
              <video
                key={currentIndex}
                ref={mediaRef}
                src={mediaSrc}
                className="media-player"
                onTimeUpdate={handleTimeUpdate}
                controls
                preload="metadata"
              />
            ) : (
              <audio
                key={currentIndex}
                ref={mediaRef}
                src={mediaSrc}
                onTimeUpdate={handleTimeUpdate}
                controls
                preload="metadata"
                style={{
                  width: "100%"
                }}
              />
            )
          ) : (
            <div className="empty">
              Select Audio/Video Files
            </div>
          )}

        </div>

        </div>

        <EqualizerPanel />

        <div className="controls">

          <button onClick={togglePlay}>
            {playing
              ? <FaPause />
              : <FaPlay />}
          </button>

          <input
            type="range"
            value={progress}
            onChange={seek}
          />

          <div className="volume">

            <FaVolumeUp />

            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) =>
                setVolume(e.target.value)
              }
            />
          </div>

          <button onClick={fullscreen}>
            <FaExpand />
          </button>

        </div>
      </div>
    </div>
  );
}

export default TheatrePlayer;
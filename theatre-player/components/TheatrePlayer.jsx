import Visualizer from "./Visualizer";
import AmbientLights from "./AmbientLights";
import EqualizerPanel from "./EqualizerPanel";
import { setupTheatreAudio }
from "../audio/surroundEngine";
import { useRef, useState, useEffect } from "react";
import Playlist from "./Playlist";
import {
  FaPlay,
  FaPause,
  FaExpand,
  FaVolumeUp
} from "react-icons/fa";

function TheatrePlayer() {

  const [audioNodes, setAudioNodes] =
    useState(null);  
  const mediaRef = useRef();

  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);

  const currentFile = playlist[currentIndex];

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [volume]);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    setPlaylist(files);
    setCurrentIndex(0);
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;

    if (!audioNodes && mediaRef.current) {
        const nodes =
            setupTheatreAudio(
            mediaRef.current
            );

        setAudioNodes(nodes);
        }

    if (playing) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play();
    }

    setPlaying(!playing);
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

  const isVideo = currentFile?.type.startsWith("video");

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
          Theatre Media Player
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
                ref={mediaRef}
                src={URL.createObjectURL(currentFile)}
                className="media-player"
                onTimeUpdate={handleTimeUpdate}
              />
            ) : (
              <audio
                ref={mediaRef}
                src={URL.createObjectURL(currentFile)}
                onTimeUpdate={handleTimeUpdate}
              />
            )
          ) : (
            <div className="empty">
              Select Audio/Video Files
            </div>
          )}
        </div>

        <div className="controls">

          <button onClick={togglePlay}>
            {playing ? <FaPause /> : <FaPlay />}
          </button>

          <input
            type="range"
            value={progress}
            onChange={seek}
          />

        <EqualizerPanel
            bass={audioNodes?.bass}
            treble={audioNodes?.treble}
            vocal={audioNodes?.vocal}
            />

            <Visualizer
            analyser={audioNodes?.analyser}
            />

            <AmbientLights />  

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
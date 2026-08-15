import { useRef, useState, useEffect, useCallback } from "react";
import Playlist from "./Playlist";
import EqualizerPanel from "./EqualizerPanel";
import "../styles/theatre.css";

function TheatrePlayer() {

  const mediaRef = useRef(null);
  const recognitionRef = useRef(null);

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
  const [voiceStatus, setVoiceStatus] = useState("Voice assistant ready");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [commandInput, setCommandInput] = useState("");

  const currentFile =
    playlist[currentIndex] || null;

  const isVideo =
    currentFile?.type?.startsWith("video/") ||
    /\.(mp4|mkv|webm|mov|avi)$/i.exec(currentFileName || "") !== null;
  

  const playPrevious = useCallback(async () => {
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
  }, [currentIndex, playlist.length]);

  const playNext = useCallback(() => {
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
    }, 120);
  }, [currentIndex, playlist.length]);

  const stopPlayback = useCallback(() => {
    if (!mediaRef.current) return;

    mediaRef.current.pause();
    setPlaying(false);
    setVoiceStatus("Playback stopped");
  }, []);

  const playCurrentTrack = useCallback(async () => {
    if (!mediaRef.current) return;

    try {
      await mediaRef.current.play();
      setPlaying(true);
      setVoiceStatus("Playback started");
    } catch (err) {
      console.error(err);
      setVoiceStatus("Playback could not start");
    }
  }, []);

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
        parts.at(-1) || ""
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
    
    const media = mediaRef.current;

    console.log("currentSrc:", media.currentSrc);
    console.log("readyState:", media.readyState);
    console.log("networkState:", media.networkState);
    console.log("error:", media.error);

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
          ((i % 13) / 13 - 0.5) *
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

  const togglePlay = useCallback(async () => {
    if (!mediaRef.current) return;

    try {
      if (!audioContextRef.current) {
        setupAudio();
      }

      if (playing) {
        mediaRef.current.pause();
        setPlaying(false);
        setVoiceStatus("Playback paused");
      } else {
        await mediaRef.current.play();
        setPlaying(true);
        setVoiceStatus("Playback started");
      }
    } catch (err) {
      console.error("Audio setup error:", err);
      setVoiceStatus("Playback command failed");
    }
  }, [playing]);

  const handleVoiceCommand = useCallback((rawCommand) => {
    const command = (rawCommand || "").trim().toLowerCase();

    if (!command) return;

    if (/\b(next|skip|forward)\b/.test(command) || /next song/.test(command)) {
      playNext();
      setVoiceStatus("Playing next track");
      return;
    }

    if (/\b(previous|back|rewind)\b/.test(command) || /previous song/.test(command)) {
      playPrevious();
      setVoiceStatus("Playing previous track");
      return;
    }

    if (/\b(pause|hold)\b/.test(command)) {
      stopPlayback();
      return;
    }

    if (/\b(stop)\b/.test(command)) {
      stopPlayback();
      return;
    }

    if (/\b(start|play|resume|continue)\b/.test(command)) {
      if (playing) {
        setVoiceStatus("Playback already running");
        return;
      }

      void playCurrentTrack();
      return;
    }

    setVoiceStatus(`Heard: "${rawCommand}". Try play, pause, stop, next, or previous.`);
  }, [playCurrentTrack, playNext, playPrevious, playing, stopPlayback]);

  const startVoiceAssistant = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");

      setVoiceTranscript(transcript);
      handleVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
      setVoiceStatus(`Voice recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceStatus("Listening for a command...");
  }, [handleVoiceCommand]);

  const stopVoiceAssistant = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceStatus("Voice assistant stopped");
  }, []);

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

  const handleCommandSubmit = (event) => {
    event.preventDefault();

    if (!commandInput.trim()) return;

    handleVoiceCommand(commandInput);
    setVoiceTranscript(commandInput);
    setCommandInput("");
  };

  return (

    <div className="theatre-container">

      {/* PLAYER AREA */}
      <div className="player-area">

        <h1 className="title">
          🎬 THEATRE MEDIA PLAYER
        </h1>

        <div className="voice-assistant">
          <div className="voice-assistant-header">
            <h2>Voice Assistant</h2>
            <button
              type="button"
              className={isListening ? "voice-button listening" : "voice-button"}
              onClick={isListening ? stopVoiceAssistant : startVoiceAssistant}
            >
              {isListening ? "🎤 Listening..." : "🎙️ Use Mic"}
            </button>
          </div>

          <form className="voice-form" onSubmit={handleCommandSubmit}>
            <input
              type="text"
              value={commandInput}
              onChange={(event) => setCommandInput(event.target.value)}
              placeholder="Try: play, pause, stop, next, previous"
            />
            <button type="submit">Send</button>
          </form>

          <div className="voice-status">{voiceStatus}</div>
          <div className="voice-transcript">
            {voiceTranscript || "Say: next, previous, pause, stop, play, start"}
          </div>
        </div>

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
            >
              <track kind="captions" srcLang="en" label="English captions" default />
            </video>
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
          >
            <track kind="captions" srcLang="en" label="English captions" default />
          </audio>
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

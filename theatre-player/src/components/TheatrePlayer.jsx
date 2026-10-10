import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import Playlist from "./Playlist";
import EqualizerPanel from "./EqualizerPanel";
import "../styles/theatre.css";
import SurroundPanel from "../SurroundPanel.jsx";
import { SurroundEngine } from "../surround-engine.js";

const PLAYABLE_TRACK_PATTERN =
  /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|wma|aiff?|mp4|mkv|webm|mov|avi)$/i;

const isPlayableTrack = (file) =>
  file.type?.startsWith("audio/") ||
  file.type?.startsWith("video/") ||
  PLAYABLE_TRACK_PATTERN.test(file.name);

const MEDIA_DB_NAME = "theatre-media-library";
const MEDIA_STORE_NAME = "tracks";
const RECENT_ASSISTANT_TRACKS_KEY = "theatreRecentAssistantTracks";
const MAX_RECENT_ASSISTANT_TRACKS = 12;

const getTrackId = (file) => file.mediaId ||
  `${file.name}:${file.size}:${file.lastModified}`;

function readRecentAssistantTracks() {
  try {
    const records = JSON.parse(localStorage.getItem(RECENT_ASSISTANT_TRACKS_KEY) || "[]");
    if (!Array.isArray(records)) return [];
    return records.filter(record =>
      record &&
      typeof record.id === "string" &&
      typeof record.name === "string" &&
      typeof record.type === "string"
    ).slice(0, MAX_RECENT_ASSISTANT_TRACKS);
  } catch (error) {
    console.error("Unable to read recently played Theatre tracks:", error);
    return [];
  }
}

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`Unable to read ${key}:`, error);
    return [];
  }
}

function openMediaDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        request.result.createObjectStore(MEDIA_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open the media library."));
  });
}

async function storeMediaFiles(files) {
  const db = await openMediaDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(MEDIA_STORE_NAME, "readwrite");
      const store = transaction.objectStore(MEDIA_STORE_NAME);
      files.forEach(file => store.put({
        id: getTrackId(file),
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        blob: file
      }));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Unable to save media files."));
      transaction.onabort = () => reject(transaction.error || new Error("Media library update was cancelled."));
    });
  } finally {
    db.close();
  }
}

async function readMediaFiles() {
  const db = await openMediaDatabase();
  try {
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction(MEDIA_STORE_NAME, "readonly")
        .objectStore(MEDIA_STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Unable to read the media library."));
    });
    return records.map(record => {
      const file = new File([record.blob], record.name, {
        type: record.type,
        lastModified: record.lastModified
      });
      file.mediaId = record.id;
      return file;
    });
  } finally {
    db.close();
  }
}

function TheatrePlayer() {

  const mediaRef = useRef(null);

  const audioContextRef =
    useRef(null);

  const analyserRef =
    useRef(null);

  const sourceRef =
    useRef(null);

  const sourceElementRef =
    useRef(null);

  const setupAudioRef = useRef(null);

  const surroundEngineRef =
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
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [recentAssistantTracks, setRecentAssistantTracks] = useState(readRecentAssistantTracks);
  const [favorites, setFavorites] = useState(() => readStoredArray("theatreFavorites"));
  const [savedPlaylists, setSavedPlaylists] = useState(() => readStoredArray("theatreSavedPlaylists"));
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState("");
  const [persistMedia, setPersistMedia] = useState(() => {
    try {
      return localStorage.getItem("theatrePersistMedia") === "true";
    } catch (error) {
      console.error("Unable to read Theatre media storage preference:", error);
      return false;
    }
  });
  const settingsImportRef = useRef(null);

  const [currentIndex,
    setCurrentIndex] =
    useState(0);

  const [playing,
    setPlaying] =
    useState(false);

  const [surroundEngine, setSurroundEngine] = useState(null);
  const [audioNodes, setAudioNodes] = useState(null);

  const [progress,
    setProgress] =
    useState(0);

  const [volume,
    setVolume] =
    useState(1);
  const [gestureControlsEnabled, setGestureControlsEnabled] = useState(false);
  
  const [mediaSrc, setMediaSrc] = useState(() =>
    new URLSearchParams(window.location.search).get("media") || ""
  );
  const [currentFileName] = useState(() => {
    const media = new URLSearchParams(window.location.search).get("media");
    return media ? media.split("/").pop() : "";
  });
  const [isAssistantWindow] = useState(
    () => new URLSearchParams(window.location.search).get("assistant") === "1"
  );
  const [assistantCommand, setAssistantCommand] = useState("");
  const [assistantStatus, setAssistantStatus] = useState(() =>
    isAssistantWindow && (!window.opener || window.opener.closed)
      ? "The Theatre player window is not connected. Reopen the assistant from the player."
      : "Load audio or video songs into the playlist, then say or type a song name."
  );
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const assistantWindowRef = useRef(null);
  const handleAssistantCommandRef = useRef(null);
  const assistantPlaybackPendingRef = useRef("");
  const touchGestureRef = useRef(null);
  const autoplayOnLoadRef = useRef(false);
  const resumePositionAppliedRef = useRef(false);
  const lastResumeSaveRef = useRef(0);

  const persistPlaybackQueue = (tracks, index) => {
    if (!libraryLoaded || isAssistantWindow) return;
    try {
      localStorage.setItem("theatreLastPlaylist", JSON.stringify(tracks.map(getTrackId)));
      localStorage.setItem("theatreCurrentTrack", String(index));
    } catch (error) {
      console.error("Unable to save Theatre playback queue:", error);
      setLibraryStatus("Could not save playback queue. Check browser storage.");
    }
  };

  const currentFile =
    playlist[currentIndex] || null;

  const availableAssistantTracks = new Map(
    [...mediaLibrary, ...playlist].map(file => [getTrackId(file), file])
  );

  const recordAssistantTrack = (file) => {
    const record = {
      id: getTrackId(file),
      name: file.name,
      type: file.type || ""
    };
    const updated = [
      record,
      ...recentAssistantTracks.filter(track => track.id !== record.id)
    ].slice(0, MAX_RECENT_ASSISTANT_TRACKS);
    try {
      localStorage.setItem(RECENT_ASSISTANT_TRACKS_KEY, JSON.stringify(updated));
      setRecentAssistantTracks(updated);
    } catch (error) {
      console.error("Unable to save recently played Theatre track:", error);
      setLibraryStatus("Track played, but recent history could not be saved. Check browser storage.");
    }
  };

  const playRecentAssistantTrack = (recentTrack) => {
    const file = availableAssistantTracks.get(recentTrack.id);
    if (!file) return;

    const playlistIndex = playlist.findIndex(track => getTrackId(track) === recentTrack.id);
    if (playlistIndex >= 0) {
      playTrackAtIndex(playlistIndex);
      return;
    }

    const updatedPlaylist = [...playlist, file];
    selectPlaylistTrack(updatedPlaylist, updatedPlaylist.length - 1, true);
  };

  const isVideo =
    currentFile?.type?.startsWith("video/") ||
    currentFileName.match(
      /\.(mp4|mkv|webm|mov|avi)$/i
    );
  
  const selectPlaylistTrack = (tracks, index, autoplay = false) => {
    const selectedTrack = tracks[index];
    if (!selectedTrack) return;

    autoplayOnLoadRef.current = autoplay;
    resumePositionAppliedRef.current = false;
    setPlaylist(tracks);
    setCurrentIndex(index);
    setMediaSrc(URL.createObjectURL(selectedTrack));
    setPlaying(false);
    setProgress(0);
    persistPlaybackQueue(tracks, index);
  };

  const handlePlaylistSelection = (index) => {
    if (index === currentIndex) return;
    selectPlaylistTrack(playlist, index);
  };

  async function resumeAudioContext() {
    const media = mediaRef.current;
    if (!media) return;

    if (
      !audioContextRef.current ||
      sourceElementRef.current !== media
    ) {
      if (!setupAudioRef.current) {
        throw new Error("The Theatre audio graph is not ready yet.");
      }
      setupAudioRef.current();
    }

    if (audioContextRef.current?.state !== "running") {
      await audioContextRef.current?.resume();
    }
  }

  const playTrackAtIndex = (index) => {
    if (!playlist.length) return;

    if (index === currentIndex) {
      resumeAudioContext()
        .then(() => mediaRef.current?.play())
        .then(() => setPlaying(true))
        .catch(err => console.error("Media playback could not start:", err));
      return;
    }

    selectPlaylistTrack(playlist, index, true);
  };

  const playPrevious = () => {
    if (playlist.length === 0) return;

    const prevIndex =
      currentIndex === 0
        ? playlist.length - 1
        : currentIndex - 1;

    playTrackAtIndex(prevIndex);
  };

  const playNext = () => {
    if (playlist.length === 0) return;

    const nextIndex =
      currentIndex === playlist.length - 1
        ? 0
        : currentIndex + 1;

    playTrackAtIndex(nextIndex);
  };

  const speakAssistantResponse = (message) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
  };

  const sendAssistantStatus = (message) => {
    if (isAssistantWindow) {
      setAssistantStatus(message);
      speakAssistantResponse(message);
      return;
    }

    const assistantWindow = assistantWindowRef.current;
    if (assistantWindow && !assistantWindow.closed) {
      assistantWindow.postMessage(
        { type: "theatre-voice-status", message },
        window.location.origin
      );
    }
  };

  const playAssistantTrack = async () => {
    if (!mediaRef.current || !mediaSrc) {
      throw new Error("No media is loaded.");
    }
    await resumeAudioContext();
    await mediaRef.current.play();
    setPlaying(true);
  };

  const handleAssistantCommand = async (rawCommand) => {
    const command = String(rawCommand || "").trim();
    if (!command) {
      sendAssistantStatus("Say or type a song name or playback command.");
      return;
    }

    if (isAssistantWindow) {
      if (!window.opener || window.opener.closed) {
        sendAssistantStatus("The Theatre player window is not connected. Reopen the assistant from the player.");
        return;
      }

      setAssistantStatus("Sending your request to the Theatre player...");
      window.opener.postMessage(
        { type: "theatre-voice-command", command },
        window.location.origin
      );
      return;
    }

    const normalizedCommand = command.toLowerCase().replace(/[.!?,]/g, "").trim();
    const sayStatus = (message) => {
      sendAssistantStatus(message);
    };

    if (/^(next|next song|next track)$/.test(normalizedCommand)) {
      if (!playlist.length) {
        sayStatus("Load songs into the playlist first.");
        return;
      }
      const nextIndex = (currentIndex + 1) % playlist.length;
      assistantPlaybackPendingRef.current = getTrackId(playlist[nextIndex]);
      playNext();
      sayStatus("Playing the next song.");
      return;
    }

    if (/^(previous|previous song|previous track)$/.test(normalizedCommand)) {
      if (!playlist.length) {
        sayStatus("Load songs into the playlist first.");
        return;
      }
      const previousIndex = (currentIndex + playlist.length - 1) % playlist.length;
      assistantPlaybackPendingRef.current = getTrackId(playlist[previousIndex]);
      playPrevious();
      sayStatus("Playing the previous song.");
      return;
    }

    if (/^(pause|pause song|pause music|stop)$/.test(normalizedCommand)) {
      mediaRef.current?.pause();
      setPlaying(false);
      sayStatus("Playback paused.");
      return;
    }

    if (/^(resume|resume song|continue|play|play music)$/.test(normalizedCommand)) {
      if (!mediaRef.current || !mediaSrc) {
        sayStatus("Load a song into the playlist first.");
        return;
      }
      try {
        await playAssistantTrack();
        sayStatus(`Playing ${currentFile?.name || currentFileName}.`);
      } catch (err) {
        console.error("Voice assistant playback failed:", err);
        sayStatus("I couldn't start playback. Try selecting the song again.");
      }
      return;
    }

    const requestedTitle = command
      .replace(/^(?:please\s+)?(?:play|start|put on|listen to)\s+/i, "")
      .replace(/^(?:the\s+)?(?:(?:audio|video)\s+)?(?:song|track)\s+/i, "")
      .trim();
    const normalizeTitle = (title) => title
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
      .trim();
    const query = normalizeTitle(requestedTitle);

    if (!query) {
      sayStatus('Tell me a song name, for example "play <song name>".');
      return;
    }

    const playableTracks = [...availableAssistantTracks.values()]
      .filter(isPlayableTrack);
    const queryWords = query.split(/\s+/);
    const matches = playableTracks
      .map(track => {
        const title = normalizeTitle(track.name);
        const titleWords = new Set(title.split(/\s+/));
        const matchedWords = queryWords.filter(word => titleWords.has(word)).length;
        const score = title === query
          ? 1
          : title.includes(query)
            ? 0.95
            : matchedWords / queryWords.length;
        return { file: track, score };
      })
      .filter(track => track.score >= 0.6)
      .sort((a, b) => b.score - a.score);

    if (!matches.length) {
      sayStatus(`I couldn't find "${requestedTitle}" in the loaded songs.`);
      return;
    }

    if (matches.length > 1 && matches[0].score === matches[1].score) {
      sayStatus(`I found more than one song matching "${requestedTitle}". Please be more specific.`);
      return;
    }

    const match = matches[0];
    const playlistIndex = playlist.findIndex(
      file => getTrackId(file) === getTrackId(match.file)
    );
    if (playlistIndex < 0) {
      assistantPlaybackPendingRef.current = getTrackId(match.file);
      const updatedPlaylist = [...playlist, match.file];
      selectPlaylistTrack(updatedPlaylist, updatedPlaylist.length - 1, true);
      sayStatus(`Playing ${match.file.name}.`);
      return;
    }

    if (playlistIndex === currentIndex) {
      try {
        await playAssistantTrack();
        recordAssistantTrack(match.file);
        sayStatus(`Playing ${match.file.name}.`);
      } catch (err) {
        console.error("Voice assistant playback failed:", err);
        sayStatus("I couldn't start playback. Try selecting the song again.");
      }
      return;
    }

    assistantPlaybackPendingRef.current = getTrackId(match.file);
    playTrackAtIndex(playlistIndex);
    sayStatus(`Playing ${match.file.name}.`);
  };

  useLayoutEffect(() => {
    handleAssistantCommandRef.current = handleAssistantCommand;
  });

  useEffect(() => {
    if (isAssistantWindow) {
      if (!window.opener || window.opener.closed) return undefined;

      const handleParentMessage = (event) => {
        if (
          event.origin !== window.location.origin ||
          event.source !== window.opener ||
          event.data?.type !== "theatre-voice-status" ||
          typeof event.data.message !== "string"
        ) {
          return;
        }
        setAssistantStatus(event.data.message);
        speakAssistantResponse(event.data.message);
      };

      window.addEventListener("message", handleParentMessage);
      window.opener.postMessage(
        { type: "theatre-voice-assistant-ready" },
        window.location.origin
      );
      return () => window.removeEventListener("message", handleParentMessage);
    }

    const handleAssistantMessage = (event) => {
      const assistantWindow = assistantWindowRef.current;
      if (
        event.origin !== window.location.origin ||
        !assistantWindow ||
        event.source !== assistantWindow
      ) {
        return;
      }

      if (event.data?.type === "theatre-voice-assistant-ready") {
        const songCount = playlist.filter(file =>
          isPlayableTrack(file)
        ).length;
        assistantWindow.postMessage(
          {
            type: "theatre-voice-status",
            message: `Connected. ${songCount} audio/video track${songCount === 1 ? "" : "s"} available in the Theatre playlist.`
          },
          window.location.origin
        );
      } else if (
        event.data?.type === "theatre-voice-command" &&
        typeof event.data.command === "string"
      ) {
        handleAssistantCommandRef.current?.(event.data.command);
      }
    };

    window.addEventListener("message", handleAssistantMessage);
    return () => window.removeEventListener("message", handleAssistantMessage);
  }, [isAssistantWindow, playlist]);

  const openVoiceAssistant = () => {
    const existingWindow = assistantWindowRef.current;
    if (existingWindow && !existingWindow.closed) {
      existingWindow.focus();
      return;
    }

    const assistantUrl = new URL(window.location.href);
    assistantUrl.searchParams.delete("media");
    assistantUrl.searchParams.set("assistant", "1");
    const assistantWindow = window.open(
      assistantUrl.toString(),
      "_blank",
      "width=520,height=650,resizable=yes,scrollbars=yes"
    );

    if (!assistantWindow) {
      setAssistantStatus("The assistant window was blocked. Allow popups for this site and try again.");
      return;
    }
    assistantWindowRef.current = assistantWindow;
  };

  const submitAssistantCommand = (event) => {
    event.preventDefault();
    const command = assistantCommand;
    setAssistantCommand("");
    handleAssistantCommand(command);
  };

  const toggleVoiceRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAssistantStatus("Voice input is not supported in this browser. Type a song name instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setAssistantTranscript("");
      setAssistantStatus("Listening for a song or playback command...");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      setAssistantTranscript(transcript);
      handleAssistantCommand(transcript);
    };
    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? "Microphone access is blocked. Allow microphone access and try again."
        : event.error === "no-speech"
          ? "I didn't hear anything. Try again or type a song name."
          : `Voice input failed (${event.error}). You can type a song name instead.`;
      setAssistantStatus(message);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Voice recognition could not start:", err);
      setAssistantStatus("Voice input could not start. Wait a moment and try again.");
    }
  };

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    }
    window.speechSynthesis?.cancel();
  }, []);

  // volume
  useEffect(() => {

    if (mediaRef.current) {

      mediaRef.current.volume =
        volume;

    }

  }, [volume]);

  // Revoke each generated URL after the media source changes or the player unmounts.
  useEffect(() => {
    return () => {
      if (mediaSrc.startsWith("blob:")) {
        URL.revokeObjectURL(mediaSrc);
      }
    }
  }, [mediaSrc]);

  // setup equalizer for audio/video
  const setupAudio = useCallback(() => {

    console.log("setupAudio called");

    const media = mediaRef.current;

    if (!media) return;

    /*
     * Reuse the existing Web Audio graph when React keeps the same
     * <video>/<audio> element. This is essential because a media element
     * may only have one MediaElementSourceNode.
     */
    if (
      sourceElementRef.current === media &&
      audioContextRef.current &&
      surroundEngineRef.current
    ) {
      return;
    }

    /*
     * If React replaced <video> with <audio> (or vice versa), tear down
     * the old graph before creating the graph for the new element.
     */
    try {
      surroundEngineRef.current?.dispose();
    } catch (error) {
      console.warn("Unable to dispose the previous surround engine:", error);
    }

    surroundEngineRef.current = null;
    setSurroundEngine(null);
    setAudioNodes(null);

    try {
      sourceRef.current?.disconnect();
    } catch (error) {
      console.warn("Unable to disconnect the previous media source:", error);
    }

    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    } catch (error) {
      console.warn("Unable to close the previous audio context:", error);
    }

    audioContextRef.current = null;
    sourceRef.current = null;
    sourceElementRef.current = null;

    const audioContext =
      new window.AudioContext();

    console.log("currentSrc:", media.currentSrc);
    console.log("readyState:", media.readyState);
    console.log("networkState:", media.networkState);
    console.log("error:", media.error);

    /*
     * THE ONLY MediaElementSourceNode for this media element.
     */
    const source =
      audioContext.createMediaElementSource(media);

    // bass
    const bass =
      audioContext.createBiquadFilter();

    bass.type = "lowshelf";
    bass.frequency.value = 120;
    bass.gain.value = 9;

    // vocal
    const vocal =
      audioContext.createBiquadFilter();

    vocal.type = "peaking";
    vocal.frequency.value = 1800;
    vocal.Q.value = 1;
    vocal.gain.value = 4;

    // treble
    const treble =
      audioContext.createBiquadFilter();

    treble.type = "highshelf";
    treble.frequency.value = 4500;
    treble.gain.value = 8;

    // analyser
    const analyser =
      audioContext.createAnalyser();

    const masterGain =
      audioContext.createGain();

    masterGain.gain.value = 1.5; // existing 30% boost preserved

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

    analyser.fftSize = 128;

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

    merger.connect(analyser);

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
          Math.pow(1 - i / length, 2);
      }
    }

    convolver.buffer = impulse;

    const wetGain =
      audioContext.createGain();

    const dryGain =
      audioContext.createGain();

    wetGain.gain.value = 0.25;
    dryGain.gain.value = 0.85;

    analyser.connect(dryGain);
    analyser.connect(convolver);
    convolver.connect(wetGain);

    dryGain.connect(masterGain);
    wetGain.connect(masterGain);

    /*
     * IMPORTANT:
     * Do NOT connect masterGain directly to destination.
     *
     * SurroundEngine receives masterGain as its input. Its dry path
     * handles normal/original EQ sound, and its master path handles
     * Surround. This gives us exactly one final destination path.
     */
    const engine =
      SurroundEngine.attach(
        media,
        {
          context: audioContext,
          source: masterGain
        }
      );

    engine.initialize();

    // Make the shared engine discoverable by SurroundPanel.
    media.__surroundEngine = engine;

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
    sourceElementRef.current = media;
    surroundEngineRef.current = engine;
    setSurroundEngine(engine);

    bassRef.current = bass;
    vocalRef.current = vocal;
    trebleRef.current = treble;
    leftDelayRef.current = leftDelay;
    rightDelayRef.current = rightDelay;
    setAudioNodes({
      bass,
      vocal,
      treble,
      analyser,
      leftDelay,
      rightDelay
    });
  }, []);

  useLayoutEffect(() => {
    setupAudioRef.current = setupAudio;
  }, [setupAudio]);

  const handleUpload =
    async (e) => {
      const files = Array.from(e.target.files || []).filter(isPlayableTrack);
      if (!files.length) {
        setLibraryStatus("Select at least one supported audio or video file.");
        return;
      }

      try {
        if (persistMedia) await storeMediaFiles(files);
        const libraryById = new Map(mediaLibrary.map(file => [getTrackId(file), file]));
        files.forEach(file => libraryById.set(getTrackId(file), file));
        setMediaLibrary(Array.from(libraryById.values()));
        setLibraryStatus(persistMedia
          ? `${files.length} file${files.length === 1 ? "" : "s"} saved in this browser's Theatre library.`
          : "Files loaded for this session only. Enable browser storage to keep them for future sessions.");
        selectPlaylistTrack(files, 0);
      } catch (error) {
        console.error("Unable to save Theatre media library:", error);
        setLibraryStatus(`Could not save files for future sessions: ${error.message}`);
        selectPlaylistTrack(files, 0);
      }
      e.target.value = "";
    };

  const toggleMediaPersistence = (enabled) => {
    try {
      localStorage.setItem("theatrePersistMedia", String(enabled));
      setPersistMedia(enabled);
      setLibraryStatus(enabled
        ? "Future uploads will be stored in this browser so playlists can be restored."
        : "Future uploads will only be available for the current session.");
    } catch (error) {
      console.error("Unable to save Theatre media storage preference:", error);
      setLibraryStatus("Could not save this preference. Check browser storage.");
    }
  };

  const clearSavedMediaLibrary = async () => {
    if (!window.confirm(
      "Delete the saved Theatre media files and playlists from this browser? This does not delete your original files."
    )) return;

    try {
      const db = await openMediaDatabase();
      try {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(MEDIA_STORE_NAME, "readwrite");
          transaction.objectStore(MEDIA_STORE_NAME).clear();
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error || new Error("Unable to clear saved media."));
          transaction.onabort = () => reject(transaction.error || new Error("Media library clear was cancelled."));
        });
      } finally {
        db.close();
      }
      [
        "theatreFavorites",
        "theatreSavedPlaylists",
        "theatreResumePositions",
        "theatreLastPlaylist",
        "theatreCurrentTrack",
        RECENT_ASSISTANT_TRACKS_KEY
      ].forEach(key => localStorage.removeItem(key));
      setFavorites([]);
      setSavedPlaylists([]);
      setRecentAssistantTracks([]);
      setMediaLibrary([]);
      setPlaylist([]);
      setCurrentIndex(0);
      setMediaSrc("");
      persistPlaybackQueue([], 0);
      mediaRef.current?.pause();
      setPlaying(false);
      setLibraryStatus("Saved Theatre media and playlists were removed from this browser.");
    } catch (error) {
      console.error("Unable to clear Theatre media library:", error);
      setLibraryStatus(`Could not clear the saved media library: ${error.message}`);
    }
  };

  const toggleFavorite = (file) => {
    const id = getTrackId(file);
    const updated = favorites.includes(id)
      ? favorites.filter(favoriteId => favoriteId !== id)
      : [...favorites, id];
    try {
      localStorage.setItem("theatreFavorites", JSON.stringify(updated));
      setFavorites(updated);
    } catch (error) {
      console.error("Unable to save Theatre favorites:", error);
      setLibraryStatus("Could not save favorite. Check browser storage.");
    }
  };

  const saveCurrentPlaylist = () => {
    if (!playlist.length) {
      setLibraryStatus("Load media before saving a playlist.");
      return;
    }
    const name = window.prompt("Name this playlist");
    if (!name?.trim()) return;
    const updated = [
      ...savedPlaylists.filter(saved => saved.name.toLowerCase() !== name.trim().toLowerCase()),
      { id: `${Date.now()}`, name: name.trim(), trackIds: playlist.map(getTrackId) }
    ];
    try {
      localStorage.setItem("theatreSavedPlaylists", JSON.stringify(updated));
      setSavedPlaylists(updated);
      setLibraryStatus(`Playlist "${name.trim()}" saved.`);
    } catch (error) {
      console.error("Unable to save Theatre playlist:", error);
      setLibraryStatus("Could not save playlist. Check browser storage.");
    }
  };

  const loadSavedPlaylist = (playlistId) => {
    const saved = savedPlaylists.find(entry => entry.id === playlistId);
    if (!saved) return;
    const tracksById = new Map(mediaLibrary.map(file => [getTrackId(file), file]));
    const tracks = saved.trackIds.map(id => tracksById.get(id)).filter(Boolean);
    if (!tracks.length) {
      setLibraryStatus("No files from this playlist are available in the saved media library.");
      return;
    }
    if (tracks.length !== saved.trackIds.length) {
      setLibraryStatus(`${saved.trackIds.length - tracks.length} saved playlist file(s) are missing from the library.`);
    } else {
      setLibraryStatus(`Loaded playlist "${saved.name}".`);
    }
    selectPlaylistTrack(tracks, 0);
  };

  const exportLibrarySettings = () => {
    try {
      const backup = {
        format: "theatre-library-settings",
        version: 1,
        createdAt: new Date().toISOString(),
        favorites,
        savedPlaylists,
        resumePositions: JSON.parse(localStorage.getItem("theatreResumePositions") || "{}")
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `theatre-settings-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setLibraryStatus("Theatre settings exported. Media files are not included in this settings backup.");
    } catch (error) {
      console.error("Unable to export Theatre settings:", error);
      setLibraryStatus("Could not export Theatre settings.");
    }
  };

  const importLibrarySettings = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setLibraryStatus("Settings backup is too large (maximum 2 MB).");
      return;
    }
    try {
      const backup = JSON.parse(await file.text());
      const validPlaylists = Array.isArray(backup.savedPlaylists) &&
        backup.savedPlaylists.every(entry =>
          entry &&
          typeof entry.id === "string" &&
          typeof entry.name === "string" &&
          Array.isArray(entry.trackIds) &&
          entry.trackIds.every(id => typeof id === "string")
        );
      const validPositions = backup.resumePositions &&
        typeof backup.resumePositions === "object" &&
        !Array.isArray(backup.resumePositions) &&
        Object.values(backup.resumePositions).every(value =>
          Number.isFinite(Number(value)) && Number(value) >= 0
        );
      if (
        backup.format !== "theatre-library-settings" ||
        backup.version !== 1 ||
        !Array.isArray(backup.favorites) ||
        !backup.favorites.every(id => typeof id === "string") ||
        !validPlaylists ||
        !validPositions
      ) {
        throw new Error("This is not a valid Theatre settings backup.");
      }

      localStorage.setItem("theatreFavorites", JSON.stringify(backup.favorites));
      localStorage.setItem("theatreSavedPlaylists", JSON.stringify(backup.savedPlaylists));
      localStorage.setItem("theatreResumePositions", JSON.stringify(backup.resumePositions));
      setFavorites(backup.favorites);
      setSavedPlaylists(backup.savedPlaylists);
      setLibraryStatus("Theatre settings restored. Your original media files must also be available in this browser.");
    } catch (error) {
      console.error("Unable to import Theatre settings:", error);
      setLibraryStatus(error.message || "Could not read Theatre settings backup.");
    }
  };

  useEffect(() => {
    if (isAssistantWindow) return undefined;
    let active = true;
    readMediaFiles()
      .then(files => {
        if (!active) return;
        setMediaLibrary(files);
        const savedIds = readStoredArray("theatreLastPlaylist");
        const byId = new Map(files.map(file => [getTrackId(file), file]));
        const restored = savedIds.map(id => byId.get(id)).filter(Boolean);
        if (restored.length) {
          const rawIndex = Number(localStorage.getItem("theatreCurrentTrack") || 0);
          const index = Number.isInteger(rawIndex) && rawIndex >= 0 && rawIndex < restored.length
            ? rawIndex
            : 0;
          setPlaylist(restored);
          setCurrentIndex(index);
          setMediaSrc(URL.createObjectURL(restored[index]));
          try {
            localStorage.setItem("theatreLastPlaylist", JSON.stringify(restored.map(getTrackId)));
            localStorage.setItem("theatreCurrentTrack", String(index));
          } catch (storageError) {
            console.error("Unable to save restored Theatre playback queue:", storageError);
            setLibraryStatus("Playlist restored, but this browser could not save the current queue.");
          }
          if (restored.length !== savedIds.length) {
            setLibraryStatus("Some files from the previous playlist are no longer available.");
          } else {
            setLibraryStatus("Previous playlist restored. Select Play to continue.");
          }
        }
        setLibraryLoaded(true);
      })
      .catch(error => {
        console.error("Unable to restore Theatre media library:", error);
        if (active) {
          setLibraryStatus(`Unable to restore saved media: ${error.message}`);
          setLibraryLoaded(true);
        }
      });
    return () => { active = false; };
  }, [isAssistantWindow]);

  const handleMediaCanPlay = async () => {
    if (!resumePositionAppliedRef.current) {
      resumePositionAppliedRef.current = true;
      const currentId = currentFile ? getTrackId(currentFile) : "";
      try {
        const positions = JSON.parse(localStorage.getItem("theatreResumePositions") || "{}");
        const position = Number(positions[currentId] || 0);
        if (position > 3 && mediaRef.current && position < mediaRef.current.duration - 3) {
          mediaRef.current.currentTime = position;
          setLibraryStatus(`Resuming ${currentFile.name} from ${Math.floor(position / 60)}:${String(Math.floor(position % 60)).padStart(2, "0")}.`);
        }
      } catch (error) {
        console.error("Unable to restore Theatre playback position:", error);
      }
    }
    if (!autoplayOnLoadRef.current) return;

    autoplayOnLoadRef.current = false;
    try {
      await resumeAudioContext();
      await mediaRef.current?.play();
      setPlaying(true);
    } catch (err) {
      assistantPlaybackPendingRef.current = "";
      console.error("Media playback could not start:", err);
    }
  };

  const handleMediaEnded = () => {
    if (currentFile) {
      try {
        const positions = JSON.parse(localStorage.getItem("theatreResumePositions") || "{}");
        delete positions[getTrackId(currentFile)];
        localStorage.setItem("theatreResumePositions", JSON.stringify(positions));
      } catch (error) {
        console.error("Unable to clear completed track resume position:", error);
      }
    }
    playNext();
  };

  const handleGestureTouchStart = (event) => {
    if (!gestureControlsEnabled || event.touches.length < 1 || event.touches.length > 2) {
      touchGestureRef.current = null;
      return;
    }

    event.preventDefault();
    const touches = Array.from(event.touches);
    touchGestureRef.current = {
      fingers: touches.length,
      x: touches.reduce((sum, touch) => sum + touch.clientX, 0) / touches.length,
      y: touches.reduce((sum, touch) => sum + touch.clientY, 0) / touches.length,
      lastX: touches.reduce((sum, touch) => sum + touch.clientX, 0) / touches.length,
      lastY: touches.reduce((sum, touch) => sum + touch.clientY, 0) / touches.length,
      startedAt: event.timeStamp
    };
  };

  const handleGestureTouchMove = (event) => {
    if (!gestureControlsEnabled || !touchGestureRef.current) return;
    event.preventDefault();

    const touches = Array.from(event.touches);
    if (!touches.length) return;

    touchGestureRef.current.lastX =
      touches.reduce((sum, touch) => sum + touch.clientX, 0) / touches.length;
    touchGestureRef.current.lastY =
      touches.reduce((sum, touch) => sum + touch.clientY, 0) / touches.length;
  };

  const handleGestureTouchEnd = (event) => {
    const gesture = touchGestureRef.current;
    if (!gestureControlsEnabled || !gesture) return;

    event.preventDefault();

    if (event.touches.length > 0) return;

    touchGestureRef.current = null;

    const deltaX = gesture.lastX - gesture.x;
    const deltaY = gesture.lastY - gesture.y;
    const duration = event.timeStamp - gesture.startedAt;
    const threshold = 55;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= threshold) {
      if (gesture.fingers === 1 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) playNext();
        else playPrevious();
      } else if (gesture.fingers === 2 && Math.abs(deltaY) > Math.abs(deltaX)) {
        setVolume(current => Math.min(1, Math.max(0, current + (deltaY < 0 ? 0.1 : -0.1))));
      }
      return;
    }

    if (duration > 350) return;
    if (gesture.fingers === 1) {
      togglePlay();
    } else {
      mediaRef.current?.pause();
      if (mediaRef.current) mediaRef.current.currentTime = 0;
      setProgress(0);
      setPlaying(false);
    }
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

        if (!setupAudioRef.current) {
          throw new Error("The Theatre audio graph is not ready yet.");
        }
        setupAudioRef.current();
      }

      if (playing) {

        mediaRef.current
          .pause();

        setPlaying(false);

      } else {

        await resumeAudioContext();
        await mediaRef
          .current
          .play();

        setPlaying(true);
      }

    } catch (err) {

      console.error("Audio setup error:", err);
    }
  };

  const handleNativePlay = () => {
    setPlaying(true);
    if (
      currentFile &&
      assistantPlaybackPendingRef.current === getTrackId(currentFile)
    ) {
      assistantPlaybackPendingRef.current = "";
      recordAssistantTrack(currentFile);
    }
    resumeAudioContext().catch(err => {
      console.error("Audio context could not resume:", err);
    });
  };

  const handleNativePause = () => {
    setPlaying(false);
    saveCurrentResumePosition();
  };

  const saveCurrentResumePosition = () => {
    const media = mediaRef.current;
    if (!currentFile || !media || !Number.isFinite(media.currentTime)) return;
    try {
      const positions = JSON.parse(localStorage.getItem("theatreResumePositions") || "{}");
      positions[getTrackId(currentFile)] = media.currentTime;
      localStorage.setItem("theatreResumePositions", JSON.stringify(positions));
      lastResumeSaveRef.current = Date.now();
    } catch (error) {
      console.error("Unable to save Theatre playback position:", error);
      setLibraryStatus("Could not save playback position. Check browser storage.");
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

    if (currentFile && media.currentTime > 0 && Date.now() - lastResumeSaveRef.current > 5000) {
      lastResumeSaveRef.current = Date.now();
      try {
        const positions = JSON.parse(localStorage.getItem("theatreResumePositions") || "{}");
        positions[getTrackId(currentFile)] = media.currentTime;
        localStorage.setItem("theatreResumePositions", JSON.stringify(positions));
      } catch (error) {
        console.error("Unable to save Theatre playback position:", error);
      }
    }
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

  // Final cleanup when TheatrePlayer itself is unmounted.
  useEffect(() => {
    return () => {
      const media = sourceElementRef.current;

      try {
        if (media?.__surroundEngine === surroundEngineRef.current) {
          delete media.__surroundEngine;
        }
      } catch (error) {
        console.warn("Unable to detach the surround engine from the media element:", error);
      }

      try {
        surroundEngineRef.current?.dispose();
      } catch (error) {
        console.warn("Unable to dispose the surround engine:", error);
      }

      try {
        audioContextRef.current?.close();
      } catch (error) {
        console.warn("Unable to close the audio context:", error);
      }

      surroundEngineRef.current = null;
      sourceRef.current = null;
      sourceElementRef.current = null;
      audioContextRef.current = null;
    };
  }, []);

  return isAssistantWindow ? (
    <main className="assistant-window">
      <section className="voice-assistant voice-assistant-window" aria-label="Voice music assistant">
        <div className="voice-assistant-header">
          <h1>🎙️ Voice Music Assistant</h1>
          <button
            type="button"
            className="assistant-close"
            onClick={() => window.close()}
          >
            Close
          </button>
        </div>
        <p className="assistant-intro">
          Ask the Theatre player to play an audio or video song from its loaded playlist.
        </p>
        <button
          type="button"
          className={`voice-button${isListening ? " listening" : ""}`}
          onClick={toggleVoiceRecognition}
          aria-pressed={isListening}
        >
          {isListening ? "Stop listening" : "🎤 Speak"}
        </button>
        <form className="voice-form" onSubmit={submitAssistantCommand}>
          <input
            type="text"
            value={assistantCommand}
            onChange={event => setAssistantCommand(event.target.value)}
            placeholder='Try "play <song name>"'
            aria-label="Song name or playback command"
          />
          <button type="submit">Send</button>
        </form>
        <div className="voice-status" role="status" aria-live="polite">
          {assistantStatus}
        </div>
        {assistantTranscript && (
          <div className="voice-transcript">
            <b>You said:</b> {assistantTranscript}
          </div>
        )}
        <div className="assistant-examples">
          Try: “play song name”, “pause”, “resume”, “next song”, or “previous song”.
        </div>
      </section>
    </main>
  ) : (

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
        <label className="media-library-toggle">
          <input
            type="checkbox"
            checked={persistMedia}
            onChange={event => toggleMediaPersistence(event.target.checked)}
          />
          Keep uploaded media in this browser for future sessions
        </label>

        <button
          type="button"
          className="assistant-launcher"
          onClick={openVoiceAssistant}
          aria-label="Open Voice Music Assistant in a new window"
        >
          🎙️ Voice Assistant
        </button>
        {isVideo && (
          <button
            type="button"
            className="gesture-toggle"
            aria-pressed={gestureControlsEnabled}
            onClick={() => setGestureControlsEnabled(enabled => !enabled)}
          >
            Touch gestures: {gestureControlsEnabled ? "On" : "Off"}
          </button>
        )}
        {gestureControlsEnabled && isVideo && (
          <p className="gesture-hint" role="status">
            1-finger tap: play/pause · 2-finger tap: stop · swipe left/right: next/previous · 2-finger swipe up/down: volume
          </p>
        )}

        {!currentFile && (
          <div className="empty">
            Select Audio/Video Files
          </div>
        )}

        {/* VIDEO WINDOW */}
        {mediaSrc && isVideo && (
          <div
            className={`media-wrapper${gestureControlsEnabled ? " gesture-mode" : ""}`}
            onTouchStart={handleGestureTouchStart}
            onTouchMove={handleGestureTouchMove}
            onTouchEnd={handleGestureTouchEnd}
            onTouchCancel={() => { touchGestureRef.current = null; }}
          >
            <video
              ref={mediaRef}
              src={mediaSrc}
              className="media-player"
              controls
              playsInline
              onPlay={handleNativePlay}
              onPause={handleNativePause}
              onCanPlay={handleMediaCanPlay}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleMediaEnded}
            />
          </div>
        )}

        {/* AUDIO WINDOW */}
        {mediaSrc && !isVideo && (
          <audio
            ref={mediaRef}
            src={mediaSrc}
            onPlay={handleNativePlay}
            onPause={handleNativePause}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleMediaEnded}
          />
        )}

        {/* EQUALIZER */}
        {mediaSrc && (
          <EqualizerPanel
            bass={audioNodes?.bass}
            vocal={audioNodes?.vocal}
            treble={audioNodes?.treble}
            analyser={audioNodes?.analyser}
            leftDelay={audioNodes?.leftDelay}
            rightDelay={audioNodes?.rightDelay}
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

        {/* SURROUND SOUND */}
        {mediaSrc && surroundEngine && (
          <SurroundPanel
            videoRef={mediaRef}
            engine={surroundEngine}
          />
        )}

        {/* PLAYLIST */}
        {(playlist.length > 0 || recentAssistantTracks.length > 0) && (
          <>
            {recentAssistantTracks.length > 0 && (
              <section className="recent-assistant-tracks" aria-label="Recently played by voice assistant">
                <h2>Recently played by Voice Assistant</h2>
                <div className="recent-assistant-track-list">
                  {recentAssistantTracks.map(track => {
                    const available = availableAssistantTracks.has(track.id);
                    return (
                      <button
                        key={track.id}
                        type="button"
                        className="recent-assistant-track"
                        disabled={!available}
                        onClick={() => playRecentAssistantTrack(track)}
                        title={available
                          ? `Play ${track.name} in Theatre`
                          : "Upload this file again, or enable media persistence before uploading to replay it later"}
                      >
                        <span aria-hidden="true">{available ? "▶" : "○"}</span>
                        <span>{track.name}</span>
                        {!available && <small>File unavailable</small>}
                      </button>
                    );
                  })}
                </div>
                {!persistMedia && (
                  <p className="recent-assistant-hint">
                    Enable “Keep uploaded media in this browser” before uploading to replay tracks after closing Theatre.
                  </p>
                )}
              </section>
            )}
            {playlist.length > 0 && (
              <>
                <div className="library-controls" aria-label="Saved playlists and favorites">
                  <button type="button" onClick={saveCurrentPlaylist}>Save Playlist</button>
                  <button type="button" className="clear-library-button" onClick={clearSavedMediaLibrary}>
                    Clear saved media
                  </button>
                  <button type="button" onClick={exportLibrarySettings}>Export Settings</button>
                  <button type="button" onClick={() => settingsImportRef.current?.click()}>Import Settings</button>
                  <input
                    ref={settingsImportRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={event => {
                      importLibrarySettings(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <label>
                    Load saved playlist
                    <select
                      defaultValue=""
                      onChange={event => {
                        loadSavedPlaylist(event.target.value);
                        event.target.value = "";
                      }}
                    >
                      <option value="">Choose a playlist</option>
                      {savedPlaylists.map(saved => (
                        <option key={saved.id} value={saved.id}>{saved.name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    aria-pressed={showFavoritesOnly}
                    onClick={() => setShowFavoritesOnly(value => !value)}
                  >
                    {showFavoritesOnly ? "Show all tracks" : `Show favorites (${favorites.length})`}
                  </button>
                </div>
                <p className="library-status" role="status" aria-live="polite">{libraryStatus}</p>
                <Playlist
                  playlist={playlist}
                  currentIndex={currentIndex}
                  setCurrentIndex={handlePlaylistSelection}
                  favorites={favorites}
                  showFavoritesOnly={showFavoritesOnly}
                  onToggleFavorite={toggleFavorite}
                />
              </>
            )}
          </>
        )} 

      </div>

    </div>

  );
}

export default TheatrePlayer;

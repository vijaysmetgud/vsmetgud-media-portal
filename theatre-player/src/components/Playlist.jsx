function Playlist({ playlist, setCurrentIndex }) {
  return (
    <div className="playlist">
      <h2>Playlist</h2>

      {playlist.length === 0 && (
        <p>No media selected</p>
      )}

      {playlist.map((file, index) => (
        <div
          key={index}
          className="track"
          onClick={() => setCurrentIndex(index)}
        >
          {file.name}
        </div>
      ))}
    </div>
  );
}

export default Playlist;

function Playlist({
  playlist,
  currentIndex,
  setCurrentIndex,
  favorites = [],
  showFavoritesOnly = false,
  onToggleFavorite = () => {}
}) {
  const visibleTracks = playlist
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => !showFavoritesOnly || favorites.includes(
      file.mediaId || `${file.name}:${file.size}:${file.lastModified}`
    ));

  return (
    <section className="playlist" aria-label="Theatre media playlist">

      <h2>{showFavoritesOnly ? "Favorite Tracks" : "Playlist"}</h2>

      {visibleTracks.length === 0 && (
        <p>{playlist.length ? "No favorite tracks in this playlist yet." : "No media selected."}</p>
      )}

      {visibleTracks.map(({ file, index }) => {
        const trackId = file.mediaId ||
          `${file.name}:${file.size}:${file.lastModified}`;
        const isFavorite = favorites.includes(trackId);
        return (
          <div className="track-row" key={trackId}>
            <button
              type="button"
              className={`track track-selector${index === currentIndex ? " active-track" : ""}`}
              aria-current={index === currentIndex ? "true" : undefined}
              onClick={() => setCurrentIndex(index)}
            >
              <span>{index === currentIndex ? "▶ " : ""}{file.name}</span>
            </button>
            <button
              type="button"
              className="favorite-toggle"
              aria-label={`${isFavorite ? "Remove from" : "Add to"} favorites: ${file.name}`}
              aria-pressed={isFavorite}
              onClick={() => onToggleFavorite(file)}
            >
              {isFavorite ? "★" : "☆"}
            </button>
          </div>
        );
      })}
    </section>
  );
}

export default Playlist;
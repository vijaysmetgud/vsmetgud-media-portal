function Playlist({
  playlist,
  currentIndex,
  onSelect,
  favorites = [],
  showFavoritesOnly = false,
  onToggleFavorite = () => {}
}) {
  const idOf = (file) =>
    file.mediaId || `${file.name}:${file.size}:${file.lastModified}`;

  const visibleTracks = playlist
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => !showFavoritesOnly || favorites.includes(idOf(file)));

  return (
    <section className="playlist" aria-label="Theatre media playlist">

      <h2>{showFavoritesOnly ? "Favorite Tracks" : "Playlist"}</h2>

      {visibleTracks.length === 0 && (
        <p>
          {playlist.length
            ? "No favorite tracks in this playlist yet. Tap ☆ next to a song to add it."
            : "No media selected."}
        </p>
      )}

      {visibleTracks.map(({ file, index }) => {
        const trackId = idOf(file);
        const isCurrent = index === currentIndex;
        const isFavorite = favorites.includes(trackId);
        return (
          <div className="track-row" key={`${trackId}:${index}`}>
            <button
              type="button"
              className={`track track-selector${isCurrent ? " active-track" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
              onClick={() => onSelect(index)}
            >
              <span style={{ fontStyle: "italic" }}>
                {isCurrent ? "▶ " : ""}{file.name}
              </span>
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

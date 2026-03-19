import { useEffect, useState } from 'react'

interface MediaItem {
  id: number
  mediaKey: string
  mediaType: string
  mediaUrl: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  createdAt: string
}

function renderMedia(item: MediaItem) {
  if (item.mediaType.startsWith('video/')) {
    return <video className="media-player" src={item.mediaUrl} poster={item.thumbnailUrl ?? undefined} controls preload="metadata" />
  }

  if (item.mediaType.startsWith('audio/')) {
    return (
      <div className="audio-frame">
        {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt={item.title} className="audio-thumbnail" /> : <div className="audio-placeholder">Audio</div>}
        <audio className="audio-player" src={item.mediaUrl} controls preload="metadata" />
      </div>
    )
  }

  return <img className="media-image" src={item.mediaUrl} alt={item.title} loading="lazy" />
}

export default function HomePage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/media')
        if (!response.ok) {
          throw new Error('Unable to load media items.')
        }

        const items = (await response.json()) as MediaItem[]
        setMedia(items)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    void loadMedia()
  }, [])

  if (loading) {
    return <section className="panel state-panel">Loading media library…</section>
  }

  if (error) {
    return <section className="panel state-panel error-text">{error}</section>
  }

  if (media.length === 0) {
    return (
      <section className="panel state-panel">
        <h2>No uploads yet</h2>
        <p>Use the Upload page to add your first image, video, or audio entry.</p>
      </section>
    )
  }

  return (
    <section className="media-grid">
      {media.map((item) => (
        <article className="media-card panel" key={item.id}>
          <div className="media-preview">{renderMedia(item)}</div>
          <div className="card-body">
            <div className="card-heading">
              <h2>{item.title}</h2>
              <span className="badge">{item.mediaType}</span>
            </div>
            <p>{item.description || 'No description provided.'}</p>
            <div className="meta-row">
              <span className="mono">{new Date(item.createdAt).toLocaleString()}</span>
              <a href={item.mediaUrl} target="_blank" rel="noreferrer">
                Open file
              </a>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

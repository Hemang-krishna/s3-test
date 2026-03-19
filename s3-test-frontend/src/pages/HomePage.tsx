import { useEffect, useState } from 'react'

interface MediaItem {
  id: number
  title: string
  videoUrl: string
}

export default function HomePage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/media')
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error || 'Unable to load media items.')
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
        <h2>No videos found</h2>
        <p>Upload a video first. Private S3 files will be played through secure presigned GET URLs.</p>
      </section>
    )
  }

  return (
    <section className="media-grid">
      {media.map(({ id, title, videoUrl }) => (
        <article className="media-card panel" key={id}>
          <div className="media-preview">
            <video controls width="400" className="media-player">
              <source src={videoUrl} type="video/mp4" />
            </video>
          </div>
          <div className="card-body">
            <div className="card-heading">
              <h2>{title}</h2>
            </div>
            <div className="meta-row">
              <a href={videoUrl} target="_blank" rel="noreferrer">
                Open secure stream
              </a>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

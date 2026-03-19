import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Toast from '../components/Toast'

interface UploadResponse {
  key: string
  uploadUrl: string
}

interface SavePayload {
  mediaKey: string
  mediaType: string
  title: string
  description: string
  thumbnailKey: string | null
}

const uploadFileWithProgress = (url: string, file: File, onProgress: (progress: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
        return
      }

      reject(new Error(`Upload failed with status ${xhr.status}`))
    }

    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.send(file)
  })

async function fetchUploadUrl(file: File, folder: string): Promise<UploadResponse> {
  const query = new URLSearchParams({
    fileName: file.name,
    contentType: file.type,
    folder,
  })

  const response = await fetch(`/api/upload-url?${query.toString()}`)
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || 'Could not create upload URL.')
  }

  return (await response.json()) as UploadResponse
}

export default function UploadPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [mediaProgress, setMediaProgress] = useState(0)
  const [audioProgress, setAudioProgress] = useState(0)
  const [thumbnailProgress, setThumbnailProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const canSubmit = useMemo(() => Boolean(title.trim() && (mediaFile || audioFile)), [title, mediaFile, audioFile])

  const onFileChange =
    (setter: (file: File | null) => void) => (event: ChangeEvent<HTMLInputElement>) => setter(event.target.files?.[0] || null)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setMediaFile(null)
    setAudioFile(null)
    setThumbnailFile(null)
    setMediaProgress(0)
    setAudioProgress(0)
    setThumbnailProgress(0)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) {
      setToast({ kind: 'error', message: 'Add a title and at least one media file before uploading.' })
      return
    }

    const primaryFile = mediaFile || audioFile
    if (!primaryFile) {
      setToast({ kind: 'error', message: 'A video, image, or audio file is required.' })
      return
    }

    try {
      setSubmitting(true)
      setToast(null)

      const primaryUpload = await fetchUploadUrl(primaryFile, 'media')
      await uploadFileWithProgress(primaryUpload.uploadUrl, primaryFile, setMediaProgress)

      let storedMediaKey = primaryUpload.key
      let storedMediaType = primaryFile.type

      if (mediaFile && audioFile) {
        const audioUpload = await fetchUploadUrl(audioFile, 'audio')
        await uploadFileWithProgress(audioUpload.uploadUrl, audioFile, setAudioProgress)
        storedMediaKey = primaryUpload.key
        storedMediaType = mediaFile.type
      }

      let thumbnailKey: string | null = null
      if (thumbnailFile) {
        const thumbnailUpload = await fetchUploadUrl(thumbnailFile, 'thumbnails')
        await uploadFileWithProgress(thumbnailUpload.uploadUrl, thumbnailFile, setThumbnailProgress)
        thumbnailKey = thumbnailUpload.key
      }

      const savePayload: SavePayload = {
        mediaKey: storedMediaKey,
        mediaType: storedMediaType,
        title: title.trim(),
        description: description.trim(),
        thumbnailKey,
      }

      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || 'Failed to save upload metadata.')
      }

      resetForm()
      setToast({ kind: 'success', message: 'Upload complete. Your media item is now available on the Home page.' })
    } catch (submitError) {
      setToast({ kind: 'error', message: submitError instanceof Error ? submitError.message : 'Upload failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel upload-layout">
      <div>
        <p className="eyebrow">Upload workflow</p>
        <h2>Send media to S3</h2>
        <p className="subtle">
          Choose a primary file (video, image, or audio), optionally add a separate audio file and thumbnail, then save metadata to MySQL.
        </p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Summer launch teaser" maxLength={255} />
        </label>

        <label>
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short summary of the media entry" rows={4} />
        </label>

        <div className="file-grid">
          <label>
            Video or image
            <input type="file" accept="video/*,image/*" onChange={onFileChange(setMediaFile)} />
          </label>

          <label>
            Optional audio
            <input type="file" accept="audio/*" onChange={onFileChange(setAudioFile)} />
          </label>

          <label>
            Optional thumbnail
            <input type="file" accept="image/*" onChange={onFileChange(setThumbnailFile)} />
          </label>
        </div>

        <div className="progress-grid">
          <div>
            <span>Primary upload</span>
            <progress max={100} value={mediaProgress} />
          </div>
          <div>
            <span>Audio upload</span>
            <progress max={100} value={audioProgress} />
          </div>
          <div>
            <span>Thumbnail upload</span>
            <progress max={100} value={thumbnailProgress} />
          </div>
        </div>

        <button className="primary-button" type="submit" disabled={!canSubmit || submitting}>
          {submitting ? 'Uploading…' : 'Upload media'}
        </button>
      </form>

      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}
    </section>
  )
}

import { useState, useEffect } from "react";
//import "./App.css";

interface Media {
  id: string;
  media_type: string;
  url: string;
}

export default function S3Test() {
  const [file, setFile] = useState<File | null>(null);
  const [media, setMedia] = useState<Media[]>([]);

  const loadMedia = async () => {
    const res = await fetch("http://localhost:7000/media");
    setMedia(await res.json());
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const upload = async () => {
    if (!file) return;

    const res = await fetch(
      `http://localhost:7000/upload-url?name=${file.name}&type=${file.type}`
    );
    const data = await res.json();

    await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });

    await fetch("http://localhost:7000/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: data.key, type: file.type })
    });

    loadMedia();
  };

  return (
    <div>
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button onClick={upload}>Upload</button>

      {media.map(m => (
        <div key={m.id}>
          {m.media_type.startsWith("image") && <img src={m.url} width={200} />}
          {m.media_type.startsWith("video") && (
            <video src={m.url} width={300} controls />
          )}
          {m.media_type.startsWith("audio") && (
            <audio src={m.url} controls />
          )}
        </div>
      ))}
    </div>
  );
}
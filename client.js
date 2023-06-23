import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const ws = new WebSocket('ws://localhost:3000');

function App() {
  const [keyword, setKeyword] = useState('');
  const [urls, setUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [status, setStatus] = useState({ loading: false, downloading: false, progress: 0, error: null });

  const handleKeywordChange = (e) => {
    setKeyword(e.target.value);
  };

  const handleGetUrls = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, downloading: false, progress: 0, error: null });
    try {
      const response = await axios.get(`/urls/${keyword}`);
      setUrls(response.data);
      setStatus({ loading: false, downloading: false, progress: 0, error: null });
    } catch (error) {
      setStatus({ loading: false, downloading: false, progress: 0, error });
    }
  };

  const handleUrlSelect = (url) => {
    setSelectedUrl(url);
  };

  const handleDownload = async () => {
    setStatus({ loading: false, downloading: true, progress: 0, error: null });
    try {
      const response = await axios.get(`/download/${selectedUrl}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'content.txt');
      document.body.appendChild(link);
      link.click();
      setStatus({ loading: false, downloading: false, progress: 0, error: null });
    } catch (error) {
      setStatus({ loading: false, downloading: false, progress: 0, error });
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status === 'downloading') {
      setStatus({ loading: false, downloading: true, progress: data.progress, error: null });
    } else if (data.status === 'success') {
      setStatus({ loading: false, downloading: false, progress: 0, error: null });
    }
  };

  return (
    <div className="App">
      <form onSubmit={handleGetUrls}>
        <label>
          Keyword:
          <input type="text" value={keyword} onChange={handleKeywordChange} />
        </label>
        <br />
        <button type="submit">Get URLs</button>
      </form>
      {status.loading && <div>Loading...</div>}
      {status.error && <div>Error: {status.error.message}</div>}
      {urls.length > 0 && (
        <ul>
          {urls.map((url) => (
            <li key={url} onClick={() => handleUrlSelect(url)}>
              {url}
            </li>
          ))}
        </ul>
      )}
      {selectedUrl && (
        <>
          <p>Selected URL: {selectedUrl}</p>
          <button onClick={handleDownload}>Download content</button>
          {status.downloading && (
            <div>
              <p>Downloading...</p>
              <progress value={status.progress} max="100"></progress>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default App;
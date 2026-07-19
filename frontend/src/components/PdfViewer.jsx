import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2, Download, ExternalLink, FileText, X } from 'lucide-react';
import { api } from '../lib/api';

const EVENT_NAME = 'emergent:open-pdf';

// Called from anywhere (even non-React code) to open the in-app PDF viewer.
export const openPdf = (url, filename) => {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { url, filename } }));
};

// Mounted once (in Layout). Listens for open-pdf events, fetches the file as a
// blob and renders it inside an <iframe> so it always displays inside the app,
// regardless of ingress cache headers or browser "download PDF" settings.
export const PdfViewerHost = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [filename, setFilename] = useState('Document');
  const [isPdf, setIsPdf] = useState(true);

  useEffect(() => {
    const handler = async (e) => {
      const { url, filename: fname } = e.detail || {};
      if (!url) return;
      setOpen(true);
      setLoading(true);
      setError(false);
      setBlobUrl(null);
      setFilename(fname || url.split('/').pop() || 'Document');
      try {
        const path = url.replace(/^\/api/, '');
        const res = await api.get(path, { responseType: 'blob' });
        const type = res.data.type || 'application/pdf';
        setIsPdf(type.includes('pdf'));
        const bUrl = URL.createObjectURL(new Blob([res.data], { type }));
        setBlobUrl(bUrl);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const cleanup = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
  };

  const handleClose = (v) => {
    setOpen(v);
    if (!v) cleanup();
  };

  const downloadFile = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openInNewTab = () => {
    if (blobUrl) window.open(blobUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 !flex flex-col overflow-hidden"
        data-testid="pdf-viewer-modal"
      >
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base truncate">
            <FileText className="w-4 h-4 text-[#005F73] shrink-0" />
            <span className="truncate" data-testid="pdf-viewer-filename">{filename}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 mr-6">
            <Button variant="outline" size="sm" onClick={openInNewTab} disabled={!blobUrl} data-testid="pdf-viewer-newtab">
              <ExternalLink className="w-4 h-4 mr-1" /> Onglet
            </Button>
            <Button variant="outline" size="sm" onClick={downloadFile} disabled={!blobUrl} data-testid="pdf-viewer-download">
              <Download className="w-4 h-4 mr-1" /> Télécharger
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-slate-100 overflow-hidden">
          {loading && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#005F73]" />
              <p>Chargement du document…</p>
            </div>
          )}
          {error && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3 px-6 text-center">
              <X className="w-8 h-8 text-red-500" />
              <p>Impossible de charger le document. Il a peut-être été supprimé ou doit être ré-uploadé.</p>
            </div>
          )}
          {!loading && !error && blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              title={filename}
              className="w-full h-full border-0"
              data-testid="pdf-viewer-frame"
            />
          )}
          {!loading && !error && blobUrl && !isPdf && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img src={blobUrl} alt={filename} className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerHost;

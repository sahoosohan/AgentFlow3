// src/api.js
/**
 * AgentFlow API Client
 * All calls are authenticated using the Supabase session JWT.
 */
import { supabase } from './lib/supabase';
import { appConfig } from './config';

const BASE = appConfig.apiUrl;

/**
 * Authenticated fetch wrapper – attaches the Supabase JWT.
 */
async function authFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  return res;
}

function getFilenameFromDisposition(headerValue) {
  if (!headerValue) return null;

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch =
    headerValue.match(/filename="([^"]+)"/i) ||
    headerValue.match(/filename=([^;]+)/i);

  return plainMatch?.[1]?.trim() || null;
}

const api = {
  /**
   * Upload a document file.
   * Uses XMLHttpRequest for upload progress tracking.
   * Returns a promise that resolves with { doc_id, batch_id, status }.
   */
  uploadDocument: (file, onProgress) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const form = new FormData();
        form.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE}/upload`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.detail || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
      } catch (err) {
        reject(err);
      }
    });
  },

  /** Get all documents for the current user. */
  getDocuments: async () => {
    const res = await authFetch('/documents');
    return res.json();
  },

  /** Get a single document by ID. */
  getDocument: async (docId) => {
    const res = await authFetch(`/documents/${docId}`);
    return res.json();
  },

  /** Download the original uploaded document. */
  downloadDocument: async (docId) => {
    const res = await authFetch(`/documents/${docId}/download`);
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');

    return {
      blob,
      filename: getFilenameFromDisposition(disposition) || `document-${docId}`,
    };
  },

  /** Delete a document and its related report. */
  deleteDocument: async (docId) => {
    const res = await authFetch(`/documents/${docId}`, { method: 'DELETE' });
    return res.json();
  },

  /** Get the report for a document. */
  getReport: async (docId) => {
    const res = await authFetch(`/reports/${docId}`);
    return res.json();
  },

  /**
   * Connect to the SSE monitor stream for a document.
   * Returns an EventSource instance.
   */
  monitorStream: async (docId) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    // EventSource doesn't support custom headers, so we pass token as query param.
    // The backend would need to support this, or we use fetch-based SSE.
    // Using fetch-based SSE for proper auth:
    return {
      /** Subscribe to SSE events via fetch */
      async subscribe(onMessage, onError, onComplete) {
        try {
          const res = await fetch(`${BASE}/monitor/${docId}/stream`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  onMessage(data);

                  if (data.status === 'complete' || data.status === 'failed') {
                    onComplete?.(data);
                    return;
                  }
                } catch (e) {
                  console.warn('SSE parse error:', e);
                }
              }
            }
          }
        } catch (err) {
          onError?.(err);
        }
      },
    };
  },
};

export default api;

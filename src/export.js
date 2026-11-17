/** Trigger a browser download while containing Blob/URL failures. */
export function downloadBlob(blob, filename, { documentRef = globalThis.document, urlRef = globalThis.URL } = {}) {
  if (!blob || typeof filename !== 'string' || !filename || !documentRef?.createElement
    || typeof urlRef?.createObjectURL !== 'function') return false;
  let objectUrl = '';
  try {
    objectUrl = urlRef.createObjectURL(blob);
    const link = documentRef.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    link.click();
    return true;
  } catch {
    return false;
  } finally {
    if (objectUrl && typeof urlRef.revokeObjectURL === 'function') {
      try { urlRef.revokeObjectURL(objectUrl); } catch { /* Cleanup must not mask the result. */ }
    }
  }
}

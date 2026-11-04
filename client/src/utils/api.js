/**
 * API Utility to safely handle HTTP requests and JSON responses.
 * Prevents "Unexpected token '<', <html> is not valid JSON" crashes
 * when NGINX or Express returns an HTML error page (413, 502, 504, 404, 500).
 */

export async function parseResponse(res, fallbackErrMsg = 'Request failed.') {
  let text = '';
  try {
    text = await res.text();
  } catch {
    throw new Error('Network connection error. Please verify your internet connection.');
  }

  let data = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // Server returned HTML or plain text instead of JSON
      if (res.status === 413) {
        throw new Error('Upload size exceeded server limit (413). Try fewer or smaller photos.');
      }
      if (res.status === 502) {
        throw new Error('Server is temporarily unavailable or restarting (502 Bad Gateway). Please try again in a moment.');
      }
      if (res.status === 504) {
        throw new Error('Request timed out (504 Gateway Timeout). Please try again.');
      }
      if (res.status === 404) {
        throw new Error('Requested resource or endpoint was not found (404).');
      }
      if (res.status === 401) {
        throw new Error('Session expired or unauthorized. Please log in again.');
      }
      if (res.status === 403) {
        throw new Error('You do not have permission to perform this action (403 Forbidden).');
      }
      if (!res.ok) {
        throw new Error(`Server returned error (${res.status}). Please try again.`);
      }
      throw new Error('Unexpected server response format.');
    }
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || fallbackErrMsg || `Request failed (${res.status})`;
    throw new Error(errorMsg);
  }

  return data || {};
}

export async function safeFetch(url, options = {}, defaultErrMsg) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error('Network connection error. Please verify your internet connection.');
  }
  return await parseResponse(res, defaultErrMsg);
}

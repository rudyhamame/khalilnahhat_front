import { apiRequest, apiBaseUrl } from "../../lib/api";

export function createMailApi(token) {
  const request = async (path, options = {}) => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (options.signal?.aborted) cancel();
    else options.signal?.addEventListener("abort", cancel, { once: true });
    const timeout = setTimeout(cancel, 65000);
    try {
      return await apiRequest(`/admin/mail${path}`, {
        token,
        timeoutMs: 65000,
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", cancel);
    }
  };
  const messagePath = (item) =>
    `/folders/${encodeURIComponent(item.folderId)}/messages/${encodeURIComponent(item.id)}`;
  return {
    status: (signal) => request("/status", { signal }),
    folders: (signal) => request("/folders", { signal }),
    storage: (signal) => request("/storage", { signal }),
    list: (folder, start, search, signal) =>
      request(
        `/messages?${new URLSearchParams({ folderId: folder, start: String(start), q: search })}`,
        { signal },
      ),
    message: (item, signal) => request(messagePath(item), { signal }),
    read: (item, read, signal) =>
      request(`${messagePath(item)}/read`, {
        method: "PATCH",
        body: { read },
        signal,
      }),
    move: (item, folderId, signal) =>
      request(`/messages/${item.id}/move`, {
        method: "POST",
        body: { fromFolderId: item.folderId, folderId },
        signal,
      }),
    remove: (item, signal) =>
      request(`/messages/${item.id}`, { method: "DELETE", signal }),
    send: (draft, signal) =>
      request("/send", { method: "POST", body: draft, signal }),
    sendStatus:(requestId,signal)=>request('/send/'+encodeURIComponent(requestId),{signal}),
    async download(item, file, signal) {
      const response = await fetch(
        `${apiBaseUrl}/admin/mail${messagePath(item)}/attachments/${file.id}`,
        { headers: { Authorization: `Bearer ${token}` }, signal },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            "The attachment could not be downloaded. Please try again.",
        );
      }
      const blob = await response.blob();
      if (signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };
}

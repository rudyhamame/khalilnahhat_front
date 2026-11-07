import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMailApi } from "./mailApi";

export function useMailbox(token) {
  const api = useMemo(() => createMailApi(token), [token]);
  const [status, setStatus] = useState(null),
    [folders, setFolders] = useState([]),
    [storage, setStorage] = useState(null);
  const [folder, setFolder] = useState("1"),
    [start, setStart] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [items, setItems] = useState([]),
    [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null);
  const [connecting, setConnecting] = useState(true),
    [loading, setLoading] = useState(false),
    [reading, setReading] = useState(false);
  const [connectionError, setConnectionError] = useState(""),
    [listError, setListError] = useState(""),
    [readerError, setReaderError] = useState("");
  const [busy, setBusy] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const mounted = useRef(true),
    readRequest = useRef(null),
    actionRequest = useRef(null),
    epoch = useRef(0),
    actionLock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      readRequest.current?.abort();
      actionRequest.current?.abort();
      epoch.current++;
    };
  }, []);
  const close = useCallback(() => {
    epoch.current++;
    readRequest.current?.abort();
    setSelected(null);
    setDetail(null);
    setReading(false);
    setReaderError("");
  }, []);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const metadata = useCallback(
    async (signal) => {
      const [result, quota] = await Promise.all([
        api.folders(signal),
        api.storage(signal),
      ]);
      if (mounted.current && !signal.aborted) {
        setFolders(result.items || []);
        setStorage(quota);
      }
    },
    [api],
  );
  useEffect(() => {
    const controller = new AbortController();
    setConnecting(true);
    setConnectionError("");
    (async () => {
      const next = await api.status(controller.signal);
      if (controller.signal.aborted) return;
      setStatus(next);
      if (next.configured) await metadata(controller.signal);
      else {
        setFolders([]);
        setItems([]);
        close();
      }
    })()
      .catch((error) => {
        if (!controller.signal.aborted) setConnectionError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setConnecting(false);
      });
    return () => controller.abort();
  }, [api, metadata, revision, close]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setStart(1);
      close();
    }, 250);
    return () => clearTimeout(timer);
  }, [query, close]);
  useEffect(() => {
    if (!status?.configured) return;
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    api
      .list(folder, start, search, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setItems(result.items || []);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setListError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, status?.configured, folder, start, search, revision]);
  const chooseFolder = (id) => {
    close();
    setItems([]);
    setFolder(id);
    setStart(1);
    setQuery("");
    setSearch("");
    setListError("");
  };
  const page = (value) => {
    close();
    setItems([]);
    setStart(value);
  };
  const open = async (item) => {
    readRequest.current?.abort();
    const controller = new AbortController();
    readRequest.current = controller;
    const request = ++epoch.current;
    setSelected(item);
    setDetail(null);
    setReading(true);
    setReaderError("");
    try {
      const result = await api.message(item, controller.signal);
      if (controller.signal.aborted || request !== epoch.current) return;
      setDetail(result.item);
      if (!result.item.read && status.capabilities?.read) {
        const receipt = await api.read(item, true, controller.signal);
        if (controller.signal.aborted || request !== epoch.current) return;
        if (receipt.confirmed) {
          setItems((current) =>
            current.map((row) =>
              row.id === item.id ? { ...row, read: true } : row,
            ),
          );
          setDetail((current) => ({ ...current, read: true }));
          await metadata(controller.signal);
        }
      }
    } catch (error) {
      if (!controller.signal.aborted && request === epoch.current)
        setReaderError(error.message);
    } finally {
      if (!controller.signal.aborted && request === epoch.current)
        setReading(false);
    }
  };
  const act = async (action, value) => {
    if (!detail || actionLock.current) return;
    const item = detail,
      request = epoch.current,
      controller = new AbortController();
    actionRequest.current?.abort();
    actionRequest.current = controller;
    actionLock.current = true;
    setBusy(action);
    setReaderError("");
    try {
      const result =
        action === "read"
          ? await api.read(item, value, controller.signal)
          : action === "move"
            ? await api.move(item, value, controller.signal)
            : await api.remove(item, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      if (!result.confirmed)
        throw new Error(
          "The change was not confirmed. Refresh before trying again.",
        );
      if (action === "read") {
        setItems((current) =>
          current.map((row) =>
            row.id === item.id ? { ...row, read: value } : row,
          ),
        );
        if (request === epoch.current)
          setDetail((current) => ({ ...current, read: value }));
      } else {
        setItems((current) => current.filter((row) => row.id !== item.id));
        if (request === epoch.current) {
          close();
          if (items.length === 1 && start > 1)
            setStart(Math.max(1, start - 50));
        }
        setNotice(
          action === "remove"
            ? "Message permanently removed."
            : `Moved to ${folders.find((row) => row.id === value)?.name || "folder"}.`,
        );
      }
      await metadata(controller.signal);
    } catch (error) {
      if (
        mounted.current &&
        !controller.signal.aborted &&
        request === epoch.current
      )
        setReaderError(error.message);
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy("");
    }
  };
  const download = async (file) => {
    if (!detail || actionLock.current) return;
    const controller = new AbortController();
    actionRequest.current?.abort();
    actionRequest.current = controller;
    actionLock.current = true;
    setBusy(file.id);
    setReaderError("");
    const request = epoch.current;
    const timeout = setTimeout(() => controller.abort(), 65000);
    try {
      await api.download(detail, file, controller.signal);
    } catch (error) {
      if (mounted.current && request === epoch.current)
        setReaderError(error.message);
    } finally {
      clearTimeout(timeout);
      actionLock.current = false;
      if (mounted.current) setBusy("");
    }
  };
  return {
    api,
    status,
    folders,
    storage,
    folder,
    start,
    query,
    setQuery,
    search,
    items,
    selected,
    detail,
    connecting,
    loading,
    reading,
    connectionError,
    listError,
    readerError,
    busy,
    notice,
    chooseFolder,
    page,
    open,
    close,
    act,
    download,
    refresh,
    sent: () => {
      setNotice("Email sent from bookings@djkhalilnahhat.ca.");
      refresh();
    },
  };
}

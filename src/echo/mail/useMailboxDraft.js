import {confirmDeletion} from "../../lib/confirmDeletion";
import { useEffect, useRef, useState } from "react";
import {
  hasContent,
  newDraft,
  replyDraft,
  sendPayload,
} from "./mailPresentation";

function restore(key) {
  if (!key) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(key));
    if (
      !value ||
      !["to", "cc", "subject", "text", "requestId"].every(
        (field) => typeof value[field] === "string",
      )
    )
      return null;
    if (
      value.text.length > 50000 ||
      value.subject.length > 250 ||
      value.to.length > 3000 ||
      value.cc.length > 3000 ||
      !/^[a-f0-9-]{36}$/i.test(value.requestId)
    )
      return null;
    return {
      to: value.to,
      cc: value.cc,
      subject: value.subject,
      text: value.text,
      requestId: value.requestId,
      submitted: Boolean(value.submitted),
      ...(typeof value.replyMessageId === "string"
        ? { replyMessageId: value.replyMessageId }
        : {}),
    };
  } catch {
    return null;
  }
}
export function useMailboxDraft({ owner, api, onSent }) {
  const key = owner ? `echo-bookings-draft:${encodeURIComponent(owner)}` : null;
  const [draft, setDraft] = useState(() => restore(key));
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [checking,setChecking]=useState(false);
  const [sendState,setSendState]=useState('');
  const mounted = useRef(true),
    lock = useRef(false),
    controller = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!key) return;
    try {
      if (draft && hasContent(draft))
        sessionStorage.setItem(key, JSON.stringify(draft));
      else sessionStorage.removeItem(key);
    } catch {
      /* In-memory draft is still retained. */
    }
  }, [draft, key]);
  useEffect(() => {
    if (!hasContent(draft)) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft]);
  const compose = (item) => {
    setDraft((current) => current || (item ? replyDraft(item) : newDraft()));
    setOpen(true);
    setError("");
  };
  const recover = async () => {
    if(lock.current||!draft?.submitted)return;
    lock.current=true;setChecking(true);setError('');
    try{
      const result=await api.sendStatus(draft.requestId);
      if(!mounted.current)return;
      setSendState(result.sendState);
      if(result.sent){setDraft(null);setOpen(false);onSent();return;}
      if(['not_submitted','not_sent'].includes(result.sendState)){
        setDraft(current=>({...current,submitted:false,...(result.sendState==='not_sent'?{requestId:crypto.randomUUID()}:{})}));
        setError('This draft was not sent. You can edit it and send again.');
      }else setError('Sending is not confirmed. Check Sent before preparing a retry to avoid sending a duplicate.');
    }catch(failure){if(mounted.current)setError(failure.message||'Could not check send status. Your draft is kept.');}
    finally{lock.current=false;if(mounted.current)setChecking(false);}
  };
  useEffect(()=>{
    if(open&&draft?.submitted&&!sending)void recover();
    // Check once when reopening/restoring a submitted draft; do not submit it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open,draft?.requestId]);
  const prepareRetry=async()=>{
    if(lock.current||!draft?.submitted)return;
    if(!await confirmDeletion('The earlier email may already have been delivered. Prepare another send attempt? It could send a duplicate.',{title:'Prepare email retry?',confirmLabel:'Prepare retry',irreversible:false}))return;
    if(!mounted.current)return;
    setDraft(current=>({...current,requestId:crypto.randomUUID(),submitted:false}));setSendState('');setError('Retry prepared. Review the draft, then click Send email.');
  };
  const edit = (field, value) =>
    setDraft((current) =>
      current.submitted ? current : { ...current, [field]: value },
    );
  const discard = async () => {
    if (
      sending || checking ||
      (hasContent(draft) &&
        !await confirmDeletion(
          "Discard this draft and the unsent text saved in this tab?",
        ))
    )
      return;
    if (key) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Optional storage. */
      }
    }
    setDraft(null);
    setOpen(false);
    setError("");
  };
  const send = async (event) => {
    event.preventDefault();
    if (lock.current || !draft || draft.submitted) return;
    lock.current = true;
    setSending(true);
    setError("");
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 35000);
    // Retain the same request ID if an acknowledgement is lost, including across reloads.
    setDraft((current) => ({ ...current, submitted: true }));
    try {
      const result = await api.send(
        sendPayload(draft),
        controller.current.signal,
      );
      if (!mounted.current) return;
      if (result.sent !== true)
        throw new Error(
          "Sending was not confirmed. Review Sent and Needs attention.",
        );
      if (key) {
        try {
          sessionStorage.removeItem(key);
        } catch {
          /* Optional storage. */
        }
      }
      setDraft(null);
      setOpen(false);
      onSent();
    } catch (failure) {
      if (!mounted.current) return;
      const notSent =
        failure.payload?.sendState === "not_sent" ||
        (!failure.payload?.sendState&&[400, 401, 403, 404, 413, 507].includes(failure.status));
      setDraft((current) => ({ ...current, submitted: !notSent,...(notSent?{requestId:crypto.randomUUID()}:{}) }));
      setSendState(notSent?'not_sent':'uncertain');
      setError(
        notSent
          ? failure.message
          : "Sending was not confirmed. Your draft is kept. Check Sent and Needs attention before creating another copy.",
      );
    } finally {
      clearTimeout(timeout);
      lock.current = false;
      if (mounted.current) setSending(false);
    }
  };
  return {
    draft,
    open,
    sending,
    checking,sendState,recover,prepareRetry,
    error,
    compose,
    edit,
    discard,
    send,
    close: () => {
      if (!sending && !checking) setOpen(false);
    },
  };
}

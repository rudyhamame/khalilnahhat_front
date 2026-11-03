// Server replies surface as a floating badge at the bottom right of the admin workspace (see AdminToasts).
export const adminToast = (text, error = false) => { if (text) window.dispatchEvent(new CustomEvent('admin:toast', { detail: { text: String(text), error } })); };

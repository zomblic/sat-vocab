export type ToastDetail = { text: string };

export function toast(text: string) {
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("satToast", {
      detail: { text }
    })
  );
}
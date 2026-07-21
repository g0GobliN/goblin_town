/** Shared inline-reply-form toggle used by the public (info.astro) and admin (admin.astro) comment lists. */
export interface InlineReplyConfig {
  list: HTMLElement;
  /** CSS selector for the buttons that open a reply form, e.g. "[data-reply]". */
  triggerSelector: string;
  /** The id of the comment being replied to, read off the clicked trigger. */
  targetIdOf: (trigger: HTMLElement) => string;
  /** Class applied to the created form; also used to find/toggle any already-open form. */
  formClass: string;
  /** Element the form is inserted after. Returning null cancels opening the form. */
  getAnchor: (trigger: HTMLElement, targetId: string) => Element | null;
  buildFormHtml: (targetId: string) => string;
  /** Extract and validate the message; return "" to silently no-op the submit. */
  getMessage: (form: HTMLFormElement) => string;
  submit: (form: HTMLFormElement, targetId: string, message: string) => Promise<void>;
  onError: (err: unknown, form: HTMLFormElement) => void;
  /** Focused after the form is inserted. Defaults to "textarea". */
  focusSelector?: string;
  /** Called right after the form is inserted, before focusing — e.g. to copy the anchor's indent. */
  onCreated?: (form: HTMLFormElement, anchor: Element, targetId: string) => void;
}

export function attachInlineReplyForms(config: InlineReplyConfig): void {
  const focusSelector = config.focusSelector ?? "textarea";

  config.list.querySelectorAll<HTMLElement>(config.triggerSelector).forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const targetId = config.targetIdOf(trigger);
      const existing = config.list.querySelector<HTMLFormElement>(`.${config.formClass}`);
      const wasOpenHere = existing?.dataset.parent === targetId;
      existing?.remove();
      if (wasOpenHere) return;

      const anchor = config.getAnchor(trigger, targetId);
      if (!anchor) return;

      const form = document.createElement("form");
      form.className = config.formClass;
      form.dataset.parent = targetId;
      form.innerHTML = config.buildFormHtml(targetId);
      anchor.after(form);
      config.onCreated?.(form, anchor, targetId);
      form.querySelector<HTMLElement>(focusSelector)?.focus();
      form.querySelector("[data-cancel-reply]")?.addEventListener("click", () => form.remove());

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = config.getMessage(form);
        if (!message) return;
        const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        try {
          await config.submit(form, targetId, message);
        } catch (err) {
          config.onError(err, form);
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    });
  });
}

// FILE: tests/unit/use-speech-synthesis.test.tsx
// PURPOSE: Focused tests for the emergency TTS loop guard added to
//          useSpeechSynthesis. Locks the dedupe + cancel-before-
//          speak + force-flag + ESC-to-stop behaviors so they can
//          never silently regress into a queue-amplifier again.

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

let speakMock: Mock;
let cancelMock: Mock;

beforeEach(() => {
  speakMock = vi.fn();
  cancelMock = vi.fn();
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: () => [],
    },
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    vi.fn().mockImplementation((text: string) => ({
      text,
      onend: null,
      onerror: null,
    })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSpeechSynthesis — emergency loop guard", () => {
  it("speak() cancels any in-flight utterance BEFORE queueing the new one", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => result.current.speak("hello"));
    expect(cancelMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it("AUTO source ignores the SAME text on repeat (dedupe by hash)", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak("hello", { source: "auto" });
    });
    expect(speakMock).toHaveBeenCalledTimes(1);
    // Invoke onend so the in-flight flag clears, then try the SAME
    // text again as "auto" — must be deduped.
    const u = speakMock.mock.calls[0]?.[0] as { onend?: () => void };
    act(() => u.onend?.());
    act(() => {
      result.current.speak("hello", { source: "auto" });
    });
    expect(speakMock).toHaveBeenCalledTimes(1); // still 1
  });

  it("force=true (test/replay) BYPASSES the auto dedupe", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => {
      result.current.speak("hello", { source: "auto" });
    });
    const u = speakMock.mock.calls[0]?.[0] as { onend?: () => void };
    act(() => u.onend?.());
    act(() => {
      result.current.speak("hello", { source: "test", force: true });
    });
    expect(speakMock).toHaveBeenCalledTimes(2);
  });

  it("in-flight dedupe prevents queue duplication even with force=true", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    // First speak — onstart is NOT invoked but the hook flips the
    // in-flight hash immediately on speak() so the guard fires.
    act(() => {
      result.current.speak("hello", { source: "test", force: true });
    });
    // Second click with the SAME text WHILE still "in flight" — must
    // NOT enqueue a duplicate utterance.
    act(() => {
      result.current.speak("hello", { source: "test", force: true });
    });
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it("stop() calls speechSynthesis.cancel() AND clears in-flight hash", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => result.current.speak("a"));
    cancelMock.mockClear();
    act(() => result.current.stop());
    expect(cancelMock).toHaveBeenCalled();
    // After stop, a NEW speak() for the same text should NOT be
    // blocked by the stale in-flight hash.
    speakMock.mockClear();
    act(() => result.current.speak("a", { source: "test", force: true }));
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it("muted prevents speak() entirely + cancels in-flight", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => result.current.speak("first"));
    cancelMock.mockClear();
    speakMock.mockClear();
    act(() => result.current.setMuted(true));
    expect(cancelMock).toHaveBeenCalled();
    act(() => result.current.speak("second"));
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("Escape keydown calls cancel (window-level emergency stop)", () => {
    renderHook(() => useSpeechSynthesis());
    cancelMock.mockClear();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(cancelMock).toHaveBeenCalled();
  });

  it("unmount cancels any in-flight utterance", () => {
    const { result, unmount } = renderHook(() => useSpeechSynthesis());
    act(() => result.current.speak("hello"));
    cancelMock.mockClear();
    unmount();
    expect(cancelMock).toHaveBeenCalled();
  });

  it("resetDedupe() lets the same text speak again as 'auto'", () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    act(() => result.current.speak("hello", { source: "auto" }));
    const u = speakMock.mock.calls[0]?.[0] as { onend?: () => void };
    act(() => u.onend?.());
    speakMock.mockClear();
    // Without reset, same text would dedupe…
    act(() => result.current.resetDedupe());
    act(() => result.current.speak("hello", { source: "auto" }));
    expect(speakMock).toHaveBeenCalledTimes(1);
  });
});

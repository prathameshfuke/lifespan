import { useRef } from "react";

function createEnvelope(context, destination, gainValue, startTime, duration) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  gain.connect(destination);
  return gain;
}

export function useGameAudio() {
  const contextRef = useRef(null);
  const masterGainRef = useRef(null);

  function ensureAudioContext() {
    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        return null;
      }

      const context = new AudioContextClass();
      const masterGain = context.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(context.destination);

      contextRef.current = context;
      masterGainRef.current = masterGain;
    }

    if (contextRef.current.state === "suspended") {
      contextRef.current.resume();
    }

    return contextRef.current;
  }

  function pulse({
    type = "square",
    startFrequency = 640,
    endFrequency = 440,
    duration = 0.045,
    gain = 0.03,
    when = 0
  }) {
    const context = ensureAudioContext();

    if (!context || !masterGainRef.current) {
      return;
    }

    const startTime = context.currentTime + when;
    const oscillator = context.createOscillator();
    const envelope = createEnvelope(context, masterGainRef.current, gain, startTime, duration);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, endFrequency),
      startTime + duration
    );
    oscillator.connect(envelope);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  function click() {
    pulse({
      type: "square",
      startFrequency: 1260,
      endFrequency: 760,
      duration: 0.028,
      gain: 0.018
    });
  }

  function add() {
    pulse({
      type: "square",
      startFrequency: 920,
      endFrequency: 1240,
      duration: 0.05,
      gain: 0.026
    });
  }

  function subtract() {
    pulse({
      type: "square",
      startFrequency: 760,
      endFrequency: 420,
      duration: 0.05,
      gain: 0.026
    });
  }

  function advance() {
    pulse({
      type: "square",
      startFrequency: 580,
      endFrequency: 820,
      duration: 0.05,
      gain: 0.025
    });

    pulse({
      type: "square",
      startFrequency: 880,
      endFrequency: 1180,
      duration: 0.06,
      gain: 0.024,
      when: 0.05
    });
  }

  function win() {
    pulse({
      type: "triangle",
      startFrequency: 640,
      endFrequency: 640,
      duration: 0.09,
      gain: 0.028
    });

    pulse({
      type: "triangle",
      startFrequency: 860,
      endFrequency: 860,
      duration: 0.1,
      gain: 0.028,
      when: 0.09
    });

    pulse({
      type: "triangle",
      startFrequency: 1180,
      endFrequency: 1180,
      duration: 0.14,
      gain: 0.03,
      when: 0.18
    });
  }

  function reset() {
    pulse({
      type: "square",
      startFrequency: 540,
      endFrequency: 420,
      duration: 0.045,
      gain: 0.02
    });

    pulse({
      type: "square",
      startFrequency: 390,
      endFrequency: 280,
      duration: 0.055,
      gain: 0.02,
      when: 0.05
    });
  }

  return {
    click,
    add,
    subtract,
    advance,
    win,
    reset
  };
}

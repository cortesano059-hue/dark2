// src/discord/base/base.runtime.ts

// Versión fija del core
export const BASE_VERSION = "1.4.11" as const;

// Mensaje que usa bootstrap
export function runtimeDisplay() {
    return `Constatic Base ${BASE_VERSION}`;
}

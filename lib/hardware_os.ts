const darwinMajorLabels: Record<number, string> = {
  15: 'OS X 10.11 El Capitan',
  16: 'macOS 10.12 Sierra',
  17: 'macOS 10.13 High Sierra',
  18: 'macOS 10.14 Mojave',
  19: 'macOS 10.15 Catalina',
  20: 'macOS 11 Big Sur',
  21: 'macOS 12 Monterey',
  22: 'macOS 13 Ventura',
  23: 'macOS 14 Sonoma',
  24: 'macOS 15 Sequoia',
  25: 'macOS 26 Tahoe'
};

const bareWindowsEditionNames = new Set([
  'enterprise',
  'home',
  'pro',
  'professional'
]);

export function groupOperatingSystem(name: string) {
  const trimmed = name.trim();
  const normalized = trimmed.toLowerCase();

  if (normalized.includes('windows server 2025')) {
    return 'Windows Server 2025';
  }
  if (normalized.includes('windows server 2022')) {
    return 'Windows Server 2022';
  }
  if (/\bwindows\s+11\b/.test(normalized)) {
    return 'Windows 11';
  }
  if (/\bwindows\s+10\b/.test(normalized)) {
    return 'Windows 10';
  }
  if (/\bwindows\s+8\.1\b/.test(normalized)) {
    return 'Windows 8.1';
  }
  if (/\bwindows\s+8\b/.test(normalized)) {
    return 'Windows 8';
  }
  if (/\bwindows\s+7\b/.test(normalized)) {
    return 'Windows 7';
  }
  if (bareWindowsEditionNames.has(normalized) || normalized.includes('windows')) {
    return 'Windows - unknown version';
  }

  const darwinMatch = /^darwin kernel version\s+(\d+)\./i.exec(trimmed);
  if (darwinMatch) {
    const darwinMajor = Number(darwinMatch[1]);
    return darwinMajorLabels[darwinMajor] || 'macOS - future/unmapped';
  }

  if (normalized.includes('ubuntu')) {
    return 'Linux - Ubuntu kernel';
  }
  if (normalized.includes('debian')) {
    return 'Linux - Debian kernel';
  }
  if (normalized.includes('nixos')) {
    return 'Linux - NixOS kernel';
  }
  if (normalized.includes('liquorix')) {
    return 'Linux - liquorix kernel';
  }
  if (/^#\d+\b/.test(trimmed) || /\b(smp|preempt|preempt_dynamic)\b/i.test(trimmed)) {
    return 'Linux - generic kernel';
  }

  return 'Other';
}

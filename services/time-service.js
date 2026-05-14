export function getCurrentTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function getHijriDate(date) {
  const hijriMonths = [
    'Muharram',
    'Safar',
    'Rabiulawal',
    'Rabiulakhir',
    'Jamadilawal',
    'Jamadilakhir',
    'Rejab',
    'Syaaban',
    'Ramadhan',
    'Syawal',
    'Zulkaedah',
    'Zulhijjah'
  ];

  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).formatToParts(date);

    const day = parts.find((part) => part.type === 'day')?.value || '';
    const monthNumber = Number(parts.find((part) => part.type === 'month')?.value);
    const year = parts.find((part) => part.type === 'year')?.value || '';
    const monthName = hijriMonths[monthNumber - 1] || '';

    return `${day} ${monthName} ${year}`.trim();
  } catch {
    return date.toLocaleDateString();
  }
}

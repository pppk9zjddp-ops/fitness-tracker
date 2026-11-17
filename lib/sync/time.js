// Datum in der Zeitzone des Laptops bzw. mit einem mitgelieferten Offset ("+08:00").
export function localDate(ts, offset) {
  const d = new Date(ts);
  if (offset && /^[+-]\d{2}:\d{2}$/.test(offset)) {
    const sign = offset[0] === '-' ? -1 : 1;
    const min = sign * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6)));
    return new Date(d.getTime() + min * 60000).toISOString().slice(0, 10);
  }
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

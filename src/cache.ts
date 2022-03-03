/**
 * Return masked values from JSON or URLSearchParams string.
 */
export const mask = (body: string, keys: string[]) => {
  try {
    return JSON.stringify(maskKeys(JSON.parse(body), keys));
  } catch (e) {}
  return new URLSearchParams(
    Array.from(new URLSearchParams(body).entries()).filter(([key]) => {
      return !keys.includes(key);
    })
  ).toString();
};

/**
 * Recursive mask function.
 */
const maskKeys = (obj: Record<string | number, unknown>, keys: string[]) => {
  const newObj: Record<string | number, unknown> = {};
  Object.keys(obj).forEach(key => {
    if (keys.includes(key)) {
      return;
    }
    const val = obj[key];
    if (val && typeof val === 'object') {
      newObj[key] = maskKeys(val as Record<string | number, unknown>, keys);
    } else {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

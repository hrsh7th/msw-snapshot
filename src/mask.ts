import { PlainObject } from ".";

/**
 * The specifier to mask the field.
 */
type MaskSpecifier = string | RegExp;

/**
 * Mask specified header fields.
 */
export function maskHeaders(headers: Headers, specifiers: MaskSpecifier[]): Headers {
  const maskedHeaders = new Headers();
  headers.forEach((val, key) => {
    if (!specifiers.some(specifier => matchField(specifier, key))) {
      maskedHeaders.append(key, val);
    }
  });
  return maskedHeaders;
}

/**
 * Mask specified search params.
 */
export function maskURLSearchParams(searchParams: URLSearchParams, specifiers: MaskSpecifier[]): URLSearchParams {
  const maskedSearchParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (!specifiers.some(specifier => matchField(specifier, key))) {
      maskedSearchParams.append(key, value);
    }
  });
  return maskedSearchParams;
}

/**
 * Mask specified search params.
 */
export function maskJSON(json: PlainObject, specifiers: MaskSpecifier[]): PlainObject {
  if (json === null || Array.isArray(json) || typeof json !== 'object') {
    return json;
  }

  const maskedJSON: PlainObject = {};
  for (const [key, val] of Object.entries(json)) {
    if (!specifiers.some(specifier => matchField(specifier, key))) {
      maskedJSON[key] = maskJSON(val, specifiers);
    }
  }
  return maskedJSON;
}

/**
 * Mask specified form data.
 */
export function maskFormData(formData: FormData, specifiers: MaskSpecifier[]): FormData {
  const maskedFormData = new FormData();
  formData.forEach((value, key) => {
    if (!specifiers.some(specifier => matchField(specifier, key))) {
      maskedFormData.append(key, value);
    }
  });
  return maskedFormData;
}

/**
 * Match the specified field.
 */
function matchField(specifier: MaskSpecifier, field: string): boolean {
  if (typeof specifier === 'string') {
    return specifier === field;
  } else {
    return specifier.test(field);
  }
}


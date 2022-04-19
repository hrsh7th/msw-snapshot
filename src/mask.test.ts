import { maskJSON, maskHeaders, maskFormData, maskURLSearchParams } from "./mask";

describe('msw-snapshot', () => {

  it('should mask the json fields', () => {
    expect(
      maskJSON(
        {
          name: 'name',
          mask: Date.now(),
          nest: {
            mask: Date.now()
          }
        },
        ['mask']
      )
    ).toStrictEqual({ name: 'name', nest: {} })
    expect(maskJSON(1, [])).toStrictEqual(1)
  });

  it('should mask the Headers fields', () => {
    const headers = new Headers();
    headers.append('name', 'name');
    headers.append('mask', Date.now().toString());
    const keys: string[] = [];
    maskHeaders(headers, ['mask']).forEach((_, key) => {
      keys.push(key);
    });
    expect(keys).toStrictEqual(['name']);
  });

  it('should mask the URLSearchParams fields', () => {
    const params = new URLSearchParams();
    params.append('name', 'name');
    params.append('mask', Date.now().toString());
    const keys: string[] = [];
    maskURLSearchParams(params, ['mask']).forEach((_, key) => {
      keys.push(key);
    });
    expect(keys).toStrictEqual(['name']);
  });

  it('should mask the FormData fields', () => {
    const formData = new FormData();
    formData.append('name', 'name');
    formData.append('mask', Date.now().toString());
    const keys: string[] = [];
    maskFormData(formData, ['mask']).forEach((_, key) => {
      keys.push(key);
    });
    expect(keys).toStrictEqual(['name']);
  });

});


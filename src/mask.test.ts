import { describe, it, expect } from 'vitest';
import { getEntries, maskBody } from "./index.js";
import { maskJSON, maskHeaders, maskFormData, maskURLSearchParams } from "./mask.js";

describe('msw-snapshot', () => {

  it('should mask body fields', () => {
    expect(
      maskBody(JSON.stringify({
        name: 'name',
        mask: Date.now(),
        nest: {
          mask: Date.now(),
        }
      }), ['mask'])
    ).toBe(JSON.stringify({
      name: 'name',
      mask: '*****',
      nest: {
        mask: '*****'
      }
    }))
  });

  it('should mask the json fields', () => {
    expect(
      maskJSON(
        {
          name: 'John',
          mask: Date.now(),
          nest: {
            mask: Date.now()
          }
        },
        ['mask']
      )
    ).toStrictEqual({
      name: 'John',
      mask: '*****',
      nest: {
        mask: '*****'
      }
    })
    expect(maskJSON(1, [])).toStrictEqual(1)
  });

  it('should mask the Headers fields', () => {
    const headers = new Headers();
    headers.set('name', 'John');
    headers.set('mask', Date.now().toString());
    expect(getEntries(maskHeaders(headers, ['mask']))).toStrictEqual([
      ['mask', '*****'],
      ['name', 'John'],
    ]);
  });

  it('should mask the URLSearchParams fields', () => {
    const params = new URLSearchParams();
    params.append('name', 'John');
    params.append('mask', Date.now().toString());
    expect(getEntries(maskURLSearchParams(params, ['mask']))).toStrictEqual([
      ['name', 'John'],
      ['mask', '*****']
    ]);
  });

  it('should mask the FormData fields', () => {
    const formData = new FormData();
    formData.append('name', 'John');
    formData.append('mask', Date.now().toString());
    expect(getEntries(maskFormData(formData, ['mask']))).toStrictEqual([
      ['name', 'John'],
      ['mask', '*****']
    ]);
  });

});


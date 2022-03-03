import { mask } from ".";

describe('msw-snapshot', () => {

  it('should mask the key from JSON string ', async () => {
    expect(
      mask(
        JSON.stringify({
          name: 'name',
          mask: Date.now(),
        }),
        ['mask']
      )
    ).toStrictEqual(JSON.stringify({ name: 'name' }))
  });

  it('should mask the key from URLSearchParams string ', async () => {
    expect(
      mask(
        `name=name&mask=${Date.now()}`,
        ['mask']
      )
    ).toStrictEqual('name=name')
  });

});


import { expect, test } from "../../../tests/e2e";

test('should fetch pokes', async ({ page, snapshot }) => {
  snapshot();
  await page.goto('/client')
  await expect(page.getByLabel('pikachu')).toHaveText('pikachu')
  await expect(page.getByLabel('raichu')).toHaveText('raichu')
})


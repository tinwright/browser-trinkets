// __TITLE__ in a real Chrome and a real Firefox: the background leaves a first note on install,
// and what's typed in the popup is still there after it's reopened.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { browsersFor, openExtension } from '../../test/browsers.mjs';

for (const browser of browsersFor('__NAME__')) {
  test(`${browser}: the note starts with a hint and keeps what's typed`, async () => {
    const extension = await openExtension(browser, '__NAME__');
    try {
      const popup = await extension.open('popup.html');
      assert.equal(
        await popup.waitForValue('#note'),
        'Write anything here. It stays until you clear it.',
      );
      await popup.fill('#note', 'Buy milk');
      await popup.reload();
      assert.equal(await popup.waitForValue('#note'), 'Buy milk');
    } finally {
      await extension.close();
    }
  });
}

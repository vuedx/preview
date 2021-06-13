import { usePreview } from '../src';
import { render } from '@testing-library/vue';

describe('usePreview()', () => {
  describe('fetch intercetpion', () => {
    it('should use local value', async () => {
      const { findByText } = render(
        usePreview('./fixtures/MockFetchRequest.vue', 'greets world')
      );
      const el = await findByText('Hello World');
      expect(el).toBeTruthy();
    });

    it('should use imported value', async () => {
      const { findByText } = render(
        usePreview('./fixtures/MockFetchRequest.vue', 'greets everyone')
      );
      const el = await findByText('Hello Everyone');
      expect(el).toBeTruthy();
    });
  });
});

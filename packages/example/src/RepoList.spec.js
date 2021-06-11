import 'whatwg-fetch';

import { waitFor, findAllByRole, findByText } from '@testing-library/dom';
import { mount } from '@vue/test-utils';
import { usePreview, usePreviewApp } from '@vuedx/preview-test-utils';

describe('RepoList', () => {
  test('should render list of repositories', async () => {
    const wrapper = mount(usePreview('one repo'));

    await waitFor(() => {
      expect(wrapper.findAll('li')).toHaveLength(1);
      expect(wrapper.find('li').text()).toBe('preview');
    });
  });
});

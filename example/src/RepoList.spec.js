/* eslint-disable no-undef */
import { waitFor } from '@testing-library/dom';
import { mount } from '@vue/test-utils';
import { usePreview } from '@vuedx/preview-test-utils';
import 'whatwg-fetch';

describe('RepoList', () => {
  test('should render list of repositories', async () => {
    const wrapper = mount(usePreview('one repo'));
    await waitFor(() => {
      expect(wrapper.findAll('li')).toHaveLength(1);
      expect(wrapper.find('li').text()).toBe('preview');
    });
  });
});

import { render, screen } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the application header', async () => {
    await render(<App />);
    expect(screen.getByRole('header', { name: 'MobiVoice' })).toBeTruthy();
  });
});

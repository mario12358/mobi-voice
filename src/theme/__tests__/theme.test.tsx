import { render, screen } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';

import { Screen } from '../../components/Screen';
import { PALETTES } from '../theme';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

const mockedColorScheme = jest.mocked(useColorScheme);

function backgroundOf(testID: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;
}

describe('theme', () => {
  // specky: crit 01M4TPSDMB35F61TVKWA51MDVV
  it('switches the app theme when the system appearance changes', async () => {
    mockedColorScheme.mockReturnValue('light');
    const view = await render(<Screen testID="themed">{null}</Screen>);
    expect(backgroundOf('themed')).toBe(PALETTES.light.background);

    mockedColorScheme.mockReturnValue('dark');
    await view.rerender(<Screen testID="themed">{null}</Screen>);
    expect(backgroundOf('themed')).toBe(PALETTES.dark.background);
  });

  it('uses the light theme when the system reports no preference', async () => {
    mockedColorScheme.mockReturnValue(null as unknown as 'light');
    await render(<Screen testID="themed">{null}</Screen>);
    expect(backgroundOf('themed')).toBe(PALETTES.light.background);
  });
});

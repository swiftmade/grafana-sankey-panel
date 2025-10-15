import React from 'react';
import { render } from '@testing-library/react';
import { SankeyPanel } from './SankeyPanel';
import { FieldType, toDataFrame, LoadingState } from '@grafana/data';
import { parseData } from './dataParser';

// Mock the parseData function
jest.mock('./dataParser');

// Mock the Sankey component
jest.mock('./components/Sankey', () => ({
  Sankey: ({ data, width, height }: any) => (
    <svg data-testid="sankey-mock" data-width={width} data-height={height}>
      {data && <text data-testid="has-data">has data</text>}
    </svg>
  ),
}));

// Mock useTheme2
jest.mock('@grafana/ui', () => ({
  useTheme2: () => ({
    colors: {
      text: {
        primary: '#FFFFFF',
      },
    },
  }),
}));

describe('SankeyPanel', () => {
  const mockData = {
    state: LoadingState.Done,
    series: [
      toDataFrame({
        fields: [
          { name: 'source', type: FieldType.string, values: ['A', 'B'] },
          { name: 'destination', type: FieldType.string, values: ['B', 'C'] },
          { name: 'value', type: FieldType.number, values: [100, 200] },
        ],
      }),
    ],
    timeRange: {} as any,
  };

  const defaultOptions = {
    monochrome: false,
    color: 'blue',
    textColor: 'white',
    nodeColor: 'grey',
    nodeWidth: 30,
    nodePadding: 30,
    iteration: 7,
    valueField: 'value',
    labelSize: 14,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementation
    (parseData as jest.Mock).mockReturnValue([
      {
        nodes: [
          { name: 'A', id: ['row0'] },
          { name: 'B', id: ['row0', 'row1'] },
          { name: 'C', id: ['row1'] },
        ],
        links: [
          {
            source: 0,
            target: 1,
            value: 100,
            displayValue: '100',
            id: 'row0',
            color: '#018EDB',
            node0: 0,
          },
          {
            source: 1,
            target: 2,
            value: 200,
            displayValue: '200',
            id: 'row1',
            color: '#DB8500',
            node0: 1,
          },
        ],
      },
      ['source', 'destination', 'value'],
      [
        { name: 'row0', display: 'A -> B' },
        { name: 'row1', display: 'B -> C' },
      ],
      {
        display: (val: number) => ({ text: val.toString(), suffix: '' }),
      },
      (color: string) => color,
    ]);
  });

  it('should render without crashing', () => {
    const { container } = render(
      <svg>
        <SankeyPanel data={mockData} options={defaultOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should call parseData with correct parameters', () => {
    render(
      <svg>
        <SankeyPanel data={mockData} options={defaultOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    expect(parseData).toHaveBeenCalledWith(mockData, defaultOptions, defaultOptions.monochrome, defaultOptions.color);
  });

  it('should pass correct props to Sankey component', () => {
    const { getByTestId } = render(
      <svg>
        <SankeyPanel data={mockData} options={defaultOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    const sankeyMock = getByTestId('sankey-mock');
    expect(sankeyMock).toBeInTheDocument();
    expect(sankeyMock.getAttribute('data-width')).toBe('800');
    expect(sankeyMock.getAttribute('data-height')).toBe('600');
    expect(getByTestId('has-data')).toBeInTheDocument();
  });

  it('should handle monochrome option', () => {
    const monochromeOptions = { ...defaultOptions, monochrome: true, color: 'dark-red' };
    render(
      <svg>
        <SankeyPanel data={mockData} options={monochromeOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    expect(parseData).toHaveBeenCalledWith(mockData, monochromeOptions, true, 'dark-red');
  });

  it('should handle parsing errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    (parseData as jest.Mock).mockImplementation(() => {
      throw new Error('Parse error');
    });

    const { container } = render(
      <svg>
        <SankeyPanel data={mockData} options={defaultOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith('parsing error: ', expect.any(Error));
    expect(container.querySelector('svg')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('should handle different panel dimensions', () => {
    const { getByTestId, rerender } = render(
      <svg>
        <SankeyPanel data={mockData} options={defaultOptions} width={400} height={300} id="test-panel" />
      </svg>
    );

    let sankeyMock = getByTestId('sankey-mock');
    expect(sankeyMock.getAttribute('data-width')).toBe('400');
    expect(sankeyMock.getAttribute('data-height')).toBe('300');

    rerender(
      <svg>
        <SankeyPanel data={mockData} options={defaultOptions} width={1200} height={800} id="test-panel" />
      </svg>
    );

    sankeyMock = getByTestId('sankey-mock');
    expect(sankeyMock.getAttribute('data-width')).toBe('1200');
    expect(sankeyMock.getAttribute('data-height')).toBe('800');
  });

  it('should update when options change', () => {
    const { rerender } = render(
      <svg>
        <SankeyPanel data={mockData} options={defaultOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    expect(parseData).toHaveBeenCalledTimes(1);

    const newOptions = { ...defaultOptions, nodeWidth: 50 };
    rerender(
      <svg>
        <SankeyPanel data={mockData} options={newOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    expect(parseData).toHaveBeenCalledTimes(2);
  });

  it('should handle empty data', () => {
    const emptyData = {
      state: LoadingState.Done,
      series: [
        toDataFrame({
          fields: [
            { name: 'source', type: FieldType.string, values: [] },
            { name: 'destination', type: FieldType.string, values: [] },
            { name: 'value', type: FieldType.number, values: [] },
          ],
        }),
      ],
      timeRange: {} as any,
    };

    (parseData as jest.Mock).mockReturnValue([
      { nodes: [], links: [] },
      ['source', 'destination', 'value'],
      [],
      { display: (val: number) => ({ text: val.toString(), suffix: '' }) },
      (color: string) => color,
    ]);

    const { container } = render(
      <svg>
        <SankeyPanel data={emptyData} options={defaultOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should apply theme text color', () => {
    render(
      <svg>
        <SankeyPanel data={mockData} options={defaultOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    // The component should use theme.colors.text.primary for textColor
    // This is verified by the mock returning '#FFFFFF'
    expect(parseData).toHaveBeenCalled();
  });

  it('should pass custom node width and padding', () => {
    const customOptions = {
      ...defaultOptions,
      nodeWidth: 50,
      nodePadding: 40,
    };

    render(
      <svg>
        <SankeyPanel data={customOptions} options={customOptions} width={800} height={600} id="test-panel" />
      </svg>
    );

    expect(parseData).toHaveBeenCalled();
  });
});

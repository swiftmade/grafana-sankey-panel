import { parseData } from './dataParser';
import { FieldType, toDataFrame } from '@grafana/data';

// Helper to create a proper field with display function
const createField = (name: string, type: FieldType, values: any[], config?: any) => {
  return {
    name,
    type,
    values,
    config: config || {},
    display: (value: any) => ({
      text: value !== null && value !== undefined ? value.toString() : '',
      numeric: typeof value === 'number' ? value : NaN,
      prefix: '',
      suffix: '',
    }),
  };
};

describe('dataParser', () => {
  describe('parseData - 3-column format', () => {
    it('should parse basic 3-column data correctly', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A', 'B', 'C']),
          createField('destination', FieldType.string, ['B', 'C', 'D']),
          createField('value', FieldType.number, [100, 200, 300]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData, displayNames, rowDisplayNames, valueField] = parseData(mockData, options, false, 'blue');

      // Check nodes
      expect(pluginData.nodes).toHaveLength(4);
      expect(pluginData.nodes.map((n: any) => n.name)).toEqual(['A', 'B', 'C', 'D']);

      // Check links
      expect(pluginData.links).toHaveLength(3);
      expect(pluginData.links[0].value).toBe(100);
      expect(pluginData.links[1].value).toBe(200);
      expect(pluginData.links[2].value).toBe(300);

      // Check display names
      expect(displayNames).toHaveLength(3);
      expect(displayNames).toEqual(['source', 'destination', 'value']);

      // Check row display names
      expect(rowDisplayNames).toHaveLength(3);
      expect(rowDisplayNames[0].display).toBe('A -> B');
      expect(rowDisplayNames[1].display).toBe('B -> C');
      expect(rowDisplayNames[2].display).toBe('C -> D');
    });

    it('should handle duplicate nodes correctly', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A', 'A', 'B']),
          createField('destination', FieldType.string, ['B', 'C', 'C']),
          createField('value', FieldType.number, [100, 150, 200]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      // Should only have unique nodes
      expect(pluginData.nodes).toHaveLength(3);
      expect(pluginData.nodes.map((n: any) => n.name)).toEqual(['A', 'B', 'C']);

      // Check that node IDs are accumulated correctly
      expect(pluginData.nodes[0].id).toEqual(['row0', 'row1']); // A appears in rows 0 and 1
      expect(pluginData.nodes[1].id).toEqual(['row0', 'row2']); // B appears in rows 0 and 2
      expect(pluginData.nodes[2].id).toEqual(['row1', 'row2']); // C appears in rows 1 and 2
    });

    it('should assign colors from source nodes in multicolor mode', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A', 'B', 'C']),
          createField('destination', FieldType.string, ['D', 'D', 'D']),
          createField('value', FieldType.number, [100, 200, 300]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      // Each link should have a different color based on its source
      const colors = pluginData.links.map((l: any) => l.color);
      expect(colors[0]).not.toBe(colors[1]);
      expect(colors[1]).not.toBe(colors[2]);
    });

    it('should use monochrome color when monochrome is true', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A', 'B']),
          createField('destination', FieldType.string, ['C', 'D']),
          createField('value', FieldType.number, [100, 200]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, true, 'dark-blue');

      // All links should have the same color
      const colors = pluginData.links.map((l: any) => l.color);
      expect(colors[0]).toBe(colors[1]);
      expect(colors[0]).toBe('rgb(18, 80, 176)'); // dark-blue converted
    });

    it('should handle empty data gracefully', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, []),
          createField('destination', FieldType.string, []),
          createField('value', FieldType.number, []),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      expect(pluginData.nodes).toHaveLength(0);
      expect(pluginData.links).toHaveLength(0);
    });

    it('should auto-detect value field when not specified', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A']),
          createField('destination', FieldType.string, ['B']),
          createField('amount', FieldType.number, [100]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'nonexistent' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      expect(pluginData.links).toHaveLength(1);
      expect(pluginData.links[0].value).toBe(100);
    });
  });

  describe('parseData - 4-column format with color', () => {
    it('should parse 4-column data with color column detected by name', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A', 'B', 'C']),
          createField('destination', FieldType.string, ['B', 'C', 'D']),
          createField('color', FieldType.string, ['#FF0000', '#00FF00', '#0000FF']),
          createField('value', FieldType.number, [100, 200, 300]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData, displayNames] = parseData(mockData, options, false, 'blue');

      // Check nodes
      expect(pluginData.nodes).toHaveLength(4);
      expect(pluginData.nodes.map((n: any) => n.name)).toEqual(['A', 'B', 'C', 'D']);

      // Check links have custom colors
      expect(pluginData.links).toHaveLength(3);
      expect(pluginData.links[0].color).toBe('#FF0000');
      expect(pluginData.links[1].color).toBe('#00FF00');
      expect(pluginData.links[2].color).toBe('#0000FF');

      // Check display names include color column
      expect(displayNames).toHaveLength(4);
      expect(displayNames).toEqual(['source', 'destination', 'color', 'value']);
    });

    it('should parse 4-column data with color column detected by value pattern', () => {
      const frame = toDataFrame({
        fields: [
          createField('from', FieldType.string, ['A', 'B']),
          createField('to', FieldType.string, ['B', 'C']),
          createField('link_color', FieldType.string, ['red', 'blue']),
          createField('amount', FieldType.number, [100, 200]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'amount' };
      const [pluginData] = parseData(mockData, options, false, 'green');

      // Check links have the provided colors
      expect(pluginData.links).toHaveLength(2);
      expect(pluginData.links[0].color).toBe('red');
      expect(pluginData.links[1].color).toBe('blue');
    });

    it('should handle named colors from the fixColor function', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A', 'B']),
          createField('destination', FieldType.string, ['B', 'C']),
          createField('color', FieldType.string, ['dark-green', 'dark-blue']),
          createField('value', FieldType.number, [100, 200]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'orange');

      // Check that named colors are converted
      expect(pluginData.links[0].color).toBe('#1A7311'); // dark-green
      expect(pluginData.links[1].color).toBe('rgb(18, 80, 176)'); // dark-blue
    });

    it('should handle RGB color strings', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A']),
          createField('destination', FieldType.string, ['B']),
          createField('colour', FieldType.string, ['rgb(255, 128, 0)']),
          createField('value', FieldType.number, [100]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      expect(pluginData.links[0].color).toBe('rgb(255, 128, 0)');
    });

    it('should handle HSL color strings', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A']),
          createField('destination', FieldType.string, ['B']),
          createField('color', FieldType.string, ['hsl(120, 100%, 50%)']),
          createField('value', FieldType.number, [100]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      expect(pluginData.links[0].color).toBe('hsl(120, 100%, 50%)');
    });

    it('should detect color column with "colour" spelling', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A']),
          createField('destination', FieldType.string, ['B']),
          createField('colour', FieldType.string, ['#ABCDEF']),
          createField('value', FieldType.number, [100]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      expect(pluginData.links[0].color).toBe('#ABCDEF');
    });

    it('should use different colors for each link when colors are provided', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A', 'A', 'B']),
          createField('destination', FieldType.string, ['B', 'C', 'C']),
          createField('color', FieldType.string, ['#FF0000', '#00FF00', '#0000FF']),
          createField('value', FieldType.number, [100, 150, 200]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      // Each link should have its own color
      expect(pluginData.links[0].color).toBe('#FF0000');
      expect(pluginData.links[1].color).toBe('#00FF00');
      expect(pluginData.links[2].color).toBe('#0000FF');
    });
  });

  describe('parseData - invalid format', () => {
    it('should return empty data with wrong number of columns', () => {
      const frame = toDataFrame({
        fields: [
          createField('col1', FieldType.string, ['A']),
          createField('col2', FieldType.string, ['B']),
          createField('col3', FieldType.string, ['C']),
          createField('col4', FieldType.string, ['D']),
          createField('value', FieldType.number, [100]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Expected 3 or 4 columns')
      );
      expect(pluginData.nodes).toHaveLength(0);
      expect(pluginData.links).toHaveLength(0);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('color conversion', () => {
    const testColorConversion = (colorName: string, expectedRgb: string) => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A']),
          createField('destination', FieldType.string, ['B']),
          createField('value', FieldType.number, [100]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, true, colorName);

      expect(pluginData.links[0].color).toBe(expectedRgb);
    };

    it('should convert dark-green color', () => {
      testColorConversion('dark-green', '#1A7311');
    });

    it('should convert dark-blue color', () => {
      testColorConversion('dark-blue', 'rgb(18, 80, 176)');
    });

    it('should convert dark-red color', () => {
      testColorConversion('dark-red', 'rgb(173, 3, 23)');
    });

    it('should convert dark-yellow color', () => {
      testColorConversion('dark-yellow', 'rgb(207, 159, 0)');
    });

    it('should convert dark-orange color', () => {
      testColorConversion('dark-orange', 'rgb(229, 84, 0)');
    });

    it('should convert dark-purple color', () => {
      testColorConversion('dark-purple', 'rgb(124, 46, 163)');
    });

    it('should pass through unrecognized colors unchanged', () => {
      testColorConversion('#FF5733', '#FF5733');
    });
  });

  describe('link structure', () => {
    it('should create proper link structure with all required fields', () => {
      const frame = toDataFrame({
        fields: [
          createField('source', FieldType.string, ['A']),
          createField('destination', FieldType.string, ['B']),
          createField('value', FieldType.number, [100]),
        ],
      });

      const mockData = {
        series: [frame],
      };

      const options = { valueField: 'value' };
      const [pluginData] = parseData(mockData, options, false, 'blue');

      const link = pluginData.links[0];
      expect(link).toHaveProperty('source');
      expect(link).toHaveProperty('target');
      expect(link).toHaveProperty('value');
      expect(link).toHaveProperty('displayValue');
      expect(link).toHaveProperty('id');
      expect(link).toHaveProperty('color');
      expect(link).toHaveProperty('node0');

      expect(typeof link.source).toBe('number');
      expect(typeof link.target).toBe('number');
      expect(link.source).not.toBe(link.target);
    });
  });
});

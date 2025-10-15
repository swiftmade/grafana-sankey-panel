import { DataFrameView, Field, getFieldDisplayName, Vector } from '@grafana/data';
// import { color } from 'd3';
/**
 * Takes data from Grafana query and returns it in the format needed for this panel
 *
 * SIMPLIFIED 3 OR 4-COLUMN PARSER:
 * This parser expects either:
 * - 3 columns: source, destination, value
 * - 4 columns: source, destination, color, value
 *
 * The color column is automatically detected by:
 * - Column name being "color" or "colour"
 * - Column values looking like color strings (hex codes, rgb, hsl, or color names)
 *
 * It automatically builds multi-step Sankey diagrams by detecting flow paths
 *
 * @param data the data returned by the query
 * @param options the field options from the editor panel
 * @param monochrome the boolean in the editor panel that sets whether the sankey is single or multi colored
 * @param color the color chosen in the editor panel for the sankey links if monochrome bool is true
 * @return {pluginData} the node and link data for the d3-sankey
 * @return {displayNames} the display names for the headers
 * @return {rowDisplayNames}
 * @return {valueField[0]}
 */
export function parseData(data: { series: any[] }, options: { valueField: any }, monochrome: boolean, color: any) {
  

  /**
   * Colors
   * if monochrome = true, set all colors to value: color
   * else, set to multi color
   */

  function fixColor(color: string) {
    switch (color) {
      case 'dark-green':
        color = '#1A7311';
        break;
      case 'semi-dark-green':
        color = '#36872D';
        break;
      case 'light-green':
        color = '#73BF68';
        break;
      case 'super-light-green':
        color = '#96D88C';
        break;
      case 'dark-yellow':
        color = 'rgb(207, 159, 0)';
        break;
      case 'semi-dark-yellow':
        color = 'rgb(224, 180, 0)';
        break;
      case 'light-yellow':
        color = 'rgb(250, 222, 42)';
        break;
      case 'super-light-yellow':
        color = 'rgb(255, 238, 82)';
        break;
      case 'dark-red':
        color = 'rgb(173, 3, 23)';
        break;
      case 'semi-dark-red':
        color = 'rgb(196, 22, 42)';
        break;
      case 'light-red':
        color = 'rgb(242, 73, 92)';
        break;
      case 'super-light-red':
        color = 'rgb(255, 115, 131)';
        break;
      case 'dark-blue':
        color = 'rgb(18, 80, 176)';
        break;
      case 'semi-dark-blue':
        color = 'rgb(31, 96, 196)';
        break;
      case 'light-blue':
        color = 'rgb(87, 148, 242)';
        break;
      case 'super-light-blue':
        color = 'rgb(138, 184, 255)';
        break;
      case 'dark-orange':
        color = 'rgb(229, 84, 0)';
        break;
      case 'semi-dark-orange':
        color = 'rgb(250, 100, 0)';
        break;
      case 'light-orange':
        color = 'rgb(255, 152, 48)';
        break;
      case 'super-light-orange':
        color = 'rgb(255, 179, 87)';
        break;
      case 'dark-purple':
        color = 'rgb(124, 46, 163)';
        break;
      case 'semi-dark-purple':
        color = 'rgb(143, 59, 184)';
        break;
      case 'light-purple':
        color = 'rgb(184, 119, 217)';
        break;
      case 'super-light-purple':
        color = 'rgb(202, 149, 229)';
        break;
      default:
        break;
    }
    return color;
  }

  const colorArray: string[] = [];

  if (monochrome) {
    colorArray.push(fixColor(color));
    // colorArray.push(color);
  } else {
    colorArray.push('#018EDB');
    colorArray.push('#DB8500');
    colorArray.push('#7C00DB');
    colorArray.push('#DB0600');
    colorArray.push('#00DB57');
  }

  let allData = data.series[0].fields;
  let numFields = allData.length;

  // Validate: We expect either 3 fields (source, destination, value) or 4 fields (source, destination, color, value)
  if (numFields !== 3 && numFields !== 4) {
    console.error(`Expected 3 or 4 columns (source, destination, [color], value), but got ${numFields} columns.`);
    // Return empty data structure
    return [{ links: [], nodes: [] }, [], [], null, fixColor];
  }

  // If we have 4 columns, the 3rd column (index 2) is the color column
  const hasColorColumn = numFields === 4;
  const colorFieldIndex = hasColorColumn ? 2 : -1;

  // get display names (exclude color column if present)
  let displayNames: string[] = [];
  allData.forEach((field: Field<any, Vector<any>>, index: number) => {
    // Skip the color column in display names
    if (index !== colorFieldIndex) {
      displayNames.push(getFieldDisplayName(field));
    }
  });

  // Find value field (should be the numeric field, typically the 3rd column)
  let valueField = data.series.map((series: { fields: any[] }) =>
    series.fields.find((field: { name: any }) => field.name === options.valueField)
  );

  if (!valueField[0]) {
    valueField = data.series.map((series: { fields: any[] }) =>
      series.fields.find((field: { type: string }) => field.type === 'number')
    );
  }

  const series = data.series[0];
  const frame = new DataFrameView(series);

  // Initialize arrays
  let pluginDataLinks: Array<{
    source: number;
    target: number;
    value: number;
    displayValue: any;
    id: string;
    color: any;
    node0: any;
  }> = [];
  let pluginDataNodes: Array<{ name: any; id: any }> = [];
  let nodeColorMap: Map<string, any> = new Map();
  let rowDisplayNames: Array<{ name: any; display: any }> = [];

  let rowId = 0;
  let colorIndex = 0;

  // Helper function to get or create a node
  const getOrCreateNode = (nodeName: any): number => {
    let index = pluginDataNodes.findIndex((e) => e.name === nodeName);
    if (index === -1) {
      index = pluginDataNodes.push({ name: nodeName, id: [`row${rowId}`] }) - 1;

      // Assign color based on source nodes only
      if (!nodeColorMap.has(nodeName)) {
        const color = colorArray[colorIndex % colorArray.length];
        nodeColorMap.set(nodeName, color);
        colorIndex++;
      }
    } else {
      pluginDataNodes[index].id.push(`row${rowId}`);
    }
    return index;
  };

  // Parse each row as a direct source -> destination link
  frame.forEach((row) => {
    const sourceName = row[0]; // First column: source
    const targetName = row[1]; // Second column: destination

    // Determine color and value positions based on whether we have a color column
    let customColor: string | null = null;
    let valueRaw: number;

    if (colorFieldIndex === 2) {
      // 4-column format: source, destination, color, value
      customColor = row[2];
      valueRaw = row[3];
    } else {
      // 3-column format: source, destination, value
      valueRaw = row[2];
    }

    // Get or create nodes
    const sourceIndex = getOrCreateNode(sourceName);
    const targetIndex = getOrCreateNode(targetName);

    // Determine the link color
    let linkColor: string;
    if (customColor) {
      // Use custom color from the data, process it through fixColor for known color names
      linkColor = fixColor(customColor);
    } else {
      // Get the color from the source node (auto-assigned)
      linkColor = nodeColorMap.get(sourceName) || colorArray[0];
    }

    // Format display value
    let fieldValues = valueField[0].display(valueRaw);
    let displayValue;
    if (fieldValues.suffix) {
      displayValue = `${fieldValues.text} ${fieldValues.suffix}`;
    } else {
      displayValue = `${fieldValues.text}`;
    }

    // Create the link
    pluginDataLinks.push({
      source: sourceIndex,
      target: targetIndex,
      value: valueRaw,
      displayValue: displayValue,
      id: `row${rowId}`,
      color: linkColor,
      node0: sourceIndex,
    });

    // Create display name for this row
    const rowDisplay = `${sourceName} -> ${targetName}`;
    rowDisplayNames.push({ name: `row${rowId}`, display: rowDisplay });

    rowId++;
  });

  const pluginData = { links: pluginDataLinks, nodes: pluginDataNodes };

  return [pluginData, displayNames, rowDisplayNames, valueField[0], fixColor];
}

# Sankey Panel for Grafana

> Maintained by [Swiftmade OÜ](https://swiftmade.co)
> Forked from [NetSage Sankey Panel](https://github.com/netsage-project/netsage-sankey-panel)

This is a panel plugin for generating Sankey diagrams in Grafana 8.0+. Sankey diagrams are good for visualizing flow data and the width of the flows will be proportionate to the selected metric.

## Requirements

- **Grafana 8.0.0 or later** is required for this plugin to work.

## What's Different in This Fork

This fork simplifies the data parser to support **multi-step Sankey charts from 3 or 4 columns of data**:
- **3-column format**: `source`, `destination`, `value`
- **4-column format**: `source`, `destination`, `color`, `value`

This makes it easier to create complex flow visualizations without complex query structuring.

![](https://github.com/netsage-project/netsage-sankey-panel/blob/master/src/img/sankey2.png?raw=true)

## Data Format

### Basic Format (3 columns)
The basic format requires exactly 3 columns:
1. **Source** - The starting node of the flow (string)
2. **Destination** - The ending node of the flow (string)
3. **Value** - The numeric value/weight of the flow (number)

Example query result:
```
source | destination | value
-------|-------------|------
A      | B           | 100
B      | C           | 80
A      | C           | 50
```

### Custom Colors Format (4 columns)
You can optionally add a 4th column to specify custom colors for each link:
1. **Source** - The starting node of the flow (string)
2. **Destination** - The ending node of the flow (string)
3. **Color** - The color for this specific link (string)
4. **Value** - The numeric value/weight of the flow (number)

The color column is automatically detected by:
- **Column name**: If the column is named "color" or "colour"
- **Column values**: If the values look like colors (hex codes, rgb, hsl, or CSS color names)

Example query result with colors:
```
source | destination | color     | value
-------|-------------|-----------|------
A      | B           | #FF0000   | 100
B      | C           | #00FF00   | 80
A      | C           | blue      | 50
```

Supported color formats:
- **Hex codes**: `#FF0000`, `#F00`, `#FF0000FF`
- **RGB/RGBA**: `rgb(255, 0, 0)`, `rgba(255, 0, 0, 0.5)`
- **HSL/HSLA**: `hsl(120, 100%, 50%)`, `hsla(120, 100%, 50%, 0.5)`
- **CSS color names**: `red`, `blue`, `green`, etc.
- **Named theme colors**: `dark-green`, `dark-blue`, `dark-red`, `dark-yellow`, `dark-orange`, `dark-purple` (and their `semi-dark-`, `light-`, `super-light-` variants)

## How it works
The panel will draw links from the source to the destination nodes. The thickness of the links will be proportionate to the value. When using the 4-column format with custom colors, each link will use its specified color. Otherwise, colors are automatically assigned based on the source node.

![](https://github.com/netsage-project/netsage-sankey-panel/blob/master/src/img/sankey3.png?raw=true)

## Installation & Development

### Install from GitHub

```bash
git clone https://github.com/swiftmade/grafana-sankey-panel
cd grafana-sankey-panel
yarn install
yarn build
```

Copy the `dist` folder to your Grafana plugins directory, or use Docker:

```bash
docker-compose up
```

### Development

```bash
yarn dev  # Watch mode for development
yarn build  # Production build
yarn test  # Run tests
yarn lint  # Lint code
```

## Customizing
- **Links:** There are currently two options for link color: multi or single.  It is multi-colored by default.  To choose a single color for the links, toggle the "Single Link color only" option and choose your color from Grafana's color picker.
- **Nodes:** You can change the color of the rectangular nodes by changing the "Node color" option
- **Node Width** The width of the nodes can be adjusted with the "Node Width" slider or entering a number in the input box.  This number must be an integer.
- **Node Padding** The vertical padding between nodes can be adjusted with the "Node Padding" slider or entering a number in the input box.  This number must be an integer.  If your links are too skinny, try adjusting this number
- **Headers** The column headers can be changed by using a Display Name override in the editor panel.  They will be the same color you choose for Text color
- **Sankey Layout** The layout of the sankey links can be adjusted slightly using the "Layout iteration" slider. This number must be an integer and is the number of relaxation iterations used to generate the layout.



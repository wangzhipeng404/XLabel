import { XLabel } from '../core';

export type changeType =
  | 'shapes'
  | 'createMode'
  | 'continuousMode'
  | 'loading'
  | 'error'
  | 'editActive'
  | 'loaded';

export interface Config {
  zoomMax: number;
  zoomMin: number;
  lineColor: string;
  lineWidth: number;
  vertexSize: number;
  fillColor: number[];
  fillOpacity: number;
  activeColor: string;
  activeFillColor: number[];
  editable: boolean;
  onChange?: (type: changeType, xlabel: XLabel) => void;
  onError?: (msg: string) => void;
}

const config: Config = {
  zoomMax: 10,
  zoomMin: 0.5,
  lineColor: `#00FF00`,
  lineWidth: 1,
  vertexSize: 8,
  fillColor: [0, 255, 0],
  fillOpacity: 0.1,
  activeColor: '#a8071a',
  activeFillColor: [245, 34, 45],
  editable: true,
  onChange: () => {},
  onError: () => {},
};

export default config;

export const BACKEND = process.env.REACT_APP_BACKEND || 'http://localhost:8080';
export const WS_BACKEND = BACKEND.replace(/^http/, 'ws');
export const HARD_LOGOUT = false;
export const CODE_ANALYSE_DEBOUNCE = 100;
export const BUILD_POLL_INTERVAL = 3000;
export const BUILD_LIST_FETCH_LENGTH = 5;

export const SENTRY = process.env.REACT_APP_SENTRY || null;

export const TAR_FILENAMES = {
  bitstream: 'bitstream.rbf',
  stdout: 'stdout',
  stderr: 'stderr',

  source: {
    'vhdl': 'src/mod_top.vhd',
    'verilog': 'src/mod_top.sv',
  },
  constraints: 'src/mod_top.qsf',
};

// From material.io color tool
export const COLORS = [
  '#000000', // BLACK
  '#f44336', // RED 500
  '#2196f3', // BLUE 500
  '#00acc1', // CYAN 600
  '#388e3c', // GREEN 700
  '#ffeb3b', // YELLOW 500
  '#f57c00', // ORANGE 700
  '#5d4037', // BROWN 700
  '#37474f', // BLUE GREY 800
];

export const DEFAULT_BOARD = 'default';

export const BOARDS = {
  default: {
    name: '数电实验',
    dimensions: [5, 4],
    pins: [
      { pin: 'PIN_K24',  input: true, output: true,  clock: false, label: 'RST' },
      { placeholder: true },
      { placeholder: true },
      { pin: 'PIN_R25',  input: false, output: true, clock: true,  label: 'CLK', idx: 37 },
      { pin: 'PIN_L23',  input: true, output: true,  clock: false, label: 'IO21' },
      { pin: 'PIN_M22',  input: true, output: true,  clock: false, label: 'IO3' },
      { pin: 'PIN_J25',  input: true, output: true,  clock: false, label: 'IO6' },
      { pin: 'PIN_J26',  input: true, output: true,  clock: false, label: 'IO14' },
      { pin: 'PIN_K25',  input: true, output: true,  clock: false, label: 'IO17' },
      { pin: 'PIN_M24',  input: true, output: true,  clock: false, label: 'IO20' },
      { pin: 'PIN_M23',  input: true, output: true,  clock: false, label: 'IO2' },
      { pin: 'PIN_K26',  input: true, output: true,  clock: false, label: 'IO5' },
      { pin: 'PIN_L25',  input: true, output: true,  clock: false, label: 'IO8' },
      { pin: 'PIN_N24',  input: true, output: true,  clock: false, label: 'IO16' },
      { pin: 'PIN_N23', input: true, output: true,  clock: false, label: 'IO19' },
      { pin: 'PIN_M25', input: true, output: true,  clock: false, label: 'IO1' },
      { pin: 'PIN_AC24', input: true, output: true,  clock: false, label: 'IO4' },
      { pin: 'PIN_Y22', input: true, output: true,  clock: false, label: 'IO7' },
      { pin: 'PIN_AB24', input: true, output: true,  clock: false, label: 'IO15' },
      { pin: 'PIN_AB23', input: true, output: true,  clock: false, label: 'IO18' },
    ],
  },
};

export const BLOCK_ALIGNMENT = 175;

export const DEFAULT_FIELD = [
  { type: 'FPGA', x: 0, y: 0, id: 'fpga', persistent: true },
  { type: 'Switch4', x: 0, y: 1 * BLOCK_ALIGNMENT, id: 'switch4_1' },
  { type: 'Digit4', x: 1 * BLOCK_ALIGNMENT, y: 0, id: 'digit4_1' },
  { type: 'Digit7', x: 2 * BLOCK_ALIGNMENT, y: 0, id: 'digit7_1' },
  { type: 'Clock', x: 1 * BLOCK_ALIGNMENT, y: 1 * BLOCK_ALIGNMENT, id: 'clock_1' },
];

export const TIMEOUT = 1000 * 60 * 30;
export const TIMEOUT_BUFFER = 1000 * 60;

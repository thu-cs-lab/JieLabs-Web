export const BACKEND = "http://localhost:8080";
export const WS_BACKEND = "ws://localhost:8080";
export const HARD_LOGOUT = false;
export const CODE_ANALYSE_DEBOUNCE = 100;
export const BUILD_POLL_INTERVAL = 3000;
export const BUILD_LIST_FETCH_LENGTH = 5;

export const TAR_FILENAMES = {
  bitstream: 'bitstream.rbf',
  stdout: 'stdout',
  stderr: 'stderr',

  source: 'src/mod_top.vhd',
  constraints: 'src/mod_top.qsf',
};

// From material.io color tool
export const COLORS = [
  '#333333', // GREY 800 ~ 900
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
    pins: [
      { pin: 'PIN_K24',  input: true, output: true,  clock: false },
      { pin: 'PIN_K23',  input: true, output: true,  clock: false },
      { pin: 'PIN_H26',  input: true, output: true,  clock: false },
      { pin: 'PIN_L24',  input: true, output: true,  clock: false },
      { pin: 'PIN_L23',  input: true, output: true,  clock: false },
      { pin: 'PIN_M22',  input: true, output: true,  clock: false },
      { pin: 'PIN_J25',  input: true, output: true,  clock: false },
      { pin: 'PIN_J26',  input: true, output: true,  clock: false },
      { pin: 'PIN_K25',  input: true, output: true,  clock: false },
      { pin: 'PIN_M24',  input: true, output: true,  clock: false },
      { pin: 'PIN_M23',  input: true, output: true,  clock: false },
      { pin: 'PIN_K26',  input: true, output: true,  clock: false },
      { pin: 'PIN_L25',  input: true, output: true,  clock: false },
      { pin: 'PIN_N24',  input: true, output: true,  clock: false },
      { pin: 'PIN_N23',  input: true, output: true,  clock: false },
      { pin: 'PIN_M25',  input: true, output: true,  clock: false },
      { pin: 'PIN_AC24', input: true, output: true,  clock: false },
      { pin: 'PIN_Y22',  input: true, output: true,  clock: false },
      { pin: 'PIN_AB24', input: true, output: true,  clock: false },
      { pin: 'PIN_AB23', input: true, output: true,  clock: false },
      { pin: 'PIN_AA24', input: true, output: true,  clock: false },
      { pin: 'PIN_AA23', input: true, output: true,  clock: false },
      { pin: 'PIN_AC25', input: true, output: true,  clock: false },
      { pin: 'PIN_AC26', input: true, output: true,  clock: false },
      { pin: 'PIN_U22',  input: true, output: true,  clock: false },
      { pin: 'PIN_W25',  input: true, output: true,  clock: false },
      { pin: 'PIN_W26',  input: true, output: true,  clock: false },
      { pin: 'PIN_R24',  input: true, output: true,  clock: false },
      { pin: 'PIN_T23',  input: true, output: true,  clock: false },
      { pin: 'PIN_V25',  input: true, output: true,  clock: false },
      { pin: 'PIN_V26',  input: true, output: true,  clock: false },
      { pin: 'PIN_U25',  input: true, output: true,  clock: false },
      { pin: 'PIN_U26',  input: true, output: true,  clock: false },
      { pin: 'PIN_T22',  input: true, output: true,  clock: false },
      { pin: 'PIN_P24',  input: true, output: true,  clock: false },
      { pin: 'PIN_P23',  input: true, output: true,  clock: false },
      { pin: 'PIN_T25',  input: true, output: true,  clock: false },
      { pin: 'PIN_R25',  input: false, output: true, clock: true  }
    ],
  },
};

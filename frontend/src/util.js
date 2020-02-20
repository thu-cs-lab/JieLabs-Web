import { BACKEND } from './config';

async function parseResp(resp) {
  if (resp.code >= 400)
    throw {
      code: resp.code,
      msg: resp.text(),
    };
  return await resp.json();
}

export async function get(endpoint, method = "GET") {
  const resp = await fetch(BACKEND + endpoint, {
    method,
    credentials: 'include',
  });

  return await parseResp(resp);
}

export async function post(endpoint, data, method = "POST") {
  const resp = await fetch(BACKEND + endpoint, {
    method,
    credentials: 'include',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    }
  });

  return await parseResp(resp);
}

export async function putS3(endpoint, data, method = "PUT") {
  const resp = await fetch(endpoint, {
    method,
    body: data,
    mode: 'cors',
  });

  return await resp.text();
}

function setString(array, str, offset) {
  for (let i = 0; i < str.length; i++) {
    array[offset + i] = str.charCodeAt(i);
  }
}

function octal(num, bytes) {
  num = num.toString(8);
  return "0".repeat(bytes - num.length) + num + " ";
}

function createTarOneFile(name, body) {
  let encoder = new TextEncoder();
  let bodyArray = encoder.encode(body);
  let totalLength = 512 + Math.floor((bodyArray.length + 511) / 512) * 512;
  let file = new Uint8Array(totalLength);
  setString(file, name, 0);
  // mode
  setString(file, octal(0o644, 6), 100);
  // owner
  setString(file, octal(0, 6), 108);
  // group
  setString(file, octal(0, 6), 116);
  // length
  let length = bodyArray.length;
  setString(file, octal(length, 11), 124);
  // mod time
  setString(file, octal(0, 11), 136);
  // checksum
  let checksum = 0;
  for (let i = 0; i < 148; i += 1) {
    checksum += file[i];
  }
  checksum += 8 * 32;// 8 spaces
  checksum = checksum.toString(8);
  setString(file, "0".repeat(6 - checksum.length) + checksum + "\u0000 ", 148);
  file.set(bodyArray, 512);
  return file;
}

export function toBitArray(number) {
  let res = [];
  for (let i = 0; i < 64; i++) {
    res[i] = number % 2;
    number = Math.floor(number / 2);
  }
  return res;
}

export function createTarFile(files) {
  let parts = files.map((file) => {
    let { name, body } = file;
    return createTarOneFile(name, body);
  });
  let totalLength = 0;
  parts.map((part) => totalLength += part.length);
  totalLength += 2 * 512;
  let file = new Uint8Array(totalLength);
  let offset = 0;
  for (let i = 0; i < parts.length; i++) {
    file.set(parts[i], offset);
    offset += parts[i].length;
  }
  return file;
}
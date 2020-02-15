import { BACKEND } from './config';

async function parseResp(resp) {
  if(resp.code >= 400)
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
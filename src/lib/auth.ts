export function isAuthenticated(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.cookie.split(';').some((cookie) => {
    return cookie.trim().startsWith('sidrah_auth=') && cookie.trim().split('=')[1] === 'true';
  });
}

export function login(phone: string, password: string): boolean {
  if (phone === 'ahmad' && password === 'Jallow@123') {
    document.cookie = 'sidrah_auth=true; path=/; max-age=86400; SameSite=Lax; Secure';
    return true;
  }

  return false;
}

export function logout() {
  document.cookie = 'sidrah_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
}

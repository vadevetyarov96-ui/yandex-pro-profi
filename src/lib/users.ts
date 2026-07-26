export const TEST_USER = {
  id: "user-1",
  username: "profi",
  password: "YandexPro2026!",
  displayName: "Водитель Profi",
} as const;

export function verifyCredentials(username: string, password: string) {
  const login = username.trim().toLowerCase();
  if (
    login === TEST_USER.username &&
    password === TEST_USER.password
  ) {
    return {
      id: TEST_USER.id,
      username: TEST_USER.username,
      displayName: TEST_USER.displayName,
    };
  }
  return null;
}

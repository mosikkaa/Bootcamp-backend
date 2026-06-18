export function serializeUser(u: {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  mobileNumber: string | null;
  age: number | null;
  avatar: string | null;
}) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    mobileNumber: u.mobileNumber,
    age: u.age,
    avatar: u.avatar,
    profileComplete: Boolean(u.fullName && u.mobileNumber && u.age),
  };
}

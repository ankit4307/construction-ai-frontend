// Account the site signs in with automatically, so visitors land straight in
// the chat without a login screen.
//
// IMPORTANT: this file ships inside the public website bundle, so anyone can
// read these values. Never put an admin account here. Create a dedicated
// account with a limited role (via /docs -> POST /auth/register) and make
// sure that role is only listed in `allowed_roles` for sheets you are happy
// for every visitor to see.
export const ACCESS_USER = {
  username: 'OASIS PROJECT LIMITED',
  password: 'OASIS123'
};
